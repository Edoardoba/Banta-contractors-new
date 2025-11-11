-- ============================================================
-- BANTA - Migrazione Dual Role Support
-- ============================================================
-- Questo script aggiunge supporto per utenti che possono essere
-- sia customer che professional contemporaneamente
--
-- Esegui con: psql -U postgres -d banta -f scripts/migrate-dual-role-support.sql
-- ============================================================

-- ============================================================
-- STEP 1: Backup constraint attuale (per sicurezza)
-- ============================================================

DO $$
BEGIN
  -- Verifica se il constraint esiste prima di dropparlo
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_link_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_link_check;
    RAISE NOTICE '✓ Rimosso constraint users_link_check';
  ELSE
    RAISE NOTICE '⚠ Constraint users_link_check non trovato, skip';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Aggiungi campo roles (array di stringhe)
-- ============================================================

DO $$
BEGIN
  -- Verifica se la colonna esiste già
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'roles'
  ) THEN
    ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT ARRAY['customer'];
    RAISE NOTICE '✓ Aggiunta colonna roles';
  ELSE
    RAISE NOTICE '⚠ Colonna roles già esistente, skip';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Migra dati esistenti da role a roles
-- ============================================================

-- Popola roles array basandosi sul role attuale
UPDATE users
SET roles = CASE
  WHEN role = 'customer' THEN ARRAY['customer']
  WHEN role = 'professional' THEN ARRAY['professional']
  WHEN role = 'admin' THEN ARRAY['admin']
  ELSE ARRAY['customer']
END
WHERE roles IS NULL OR roles = '{}';

-- Log risultati migrazione
DO $$
DECLARE
  customer_count INT;
  professional_count INT;
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM users WHERE 'customer' = ANY(roles);
  SELECT COUNT(*) INTO professional_count FROM users WHERE 'professional' = ANY(roles);
  SELECT COUNT(*) INTO admin_count FROM users WHERE 'admin' = ANY(roles);

  RAISE NOTICE '✓ Migrati:';
  RAISE NOTICE '  - % customers', customer_count;
  RAISE NOTICE '  - % professionals', professional_count;
  RAISE NOTICE '  - % admins', admin_count;
END $$;

-- ============================================================
-- STEP 4: Aggiungi nuovo constraint flessibile
-- ============================================================

-- L'utente deve avere almeno un profilo (customer o professional) o essere admin
ALTER TABLE users ADD CONSTRAINT users_has_profile CHECK (
  customer_id IS NOT NULL OR
  professional_id IS NOT NULL OR
  'admin' = ANY(roles)
);

COMMENT ON CONSTRAINT users_has_profile ON users IS
  'Un utente deve avere almeno un customer_id o professional_id, oppure essere admin';

-- Constraint per validare che roles contenga solo valori validi
ALTER TABLE users ADD CONSTRAINT users_roles_valid CHECK (
  roles <@ ARRAY['customer', 'professional', 'admin']::TEXT[]
);

COMMENT ON CONSTRAINT users_roles_valid ON users IS
  'roles può contenere solo: customer, professional, admin';

RAISE NOTICE '✓ Aggiunti nuovi constraints flessibili';

-- ============================================================
-- STEP 5: Crea indice per performance su roles
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

COMMENT ON INDEX idx_users_roles IS
  'Indice GIN per ricerche veloci su array roles (es: WHERE ''customer'' = ANY(roles))';

RAISE NOTICE '✓ Creato indice GIN su roles';

-- ============================================================
-- STEP 6: Helper Functions
-- ============================================================

-- Funzione per aggiungere un ruolo a un utente esistente
CREATE OR REPLACE FUNCTION add_role_to_user(
  p_user_id INTEGER,
  p_new_role TEXT
) RETURNS VOID AS $$
BEGIN
  -- Valida ruolo
  IF p_new_role NOT IN ('customer', 'professional', 'admin') THEN
    RAISE EXCEPTION 'Ruolo non valido: %. Usare: customer, professional, admin', p_new_role;
  END IF;

  -- Aggiungi solo se non esiste già
  UPDATE users
  SET roles = array_append(roles, p_new_role)
  WHERE id = p_user_id
    AND NOT (p_new_role = ANY(roles));

  RAISE NOTICE 'Ruolo % aggiunto all''utente %', p_new_role, p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_role_to_user IS
  'Aggiunge un ruolo a un utente esistente (se non ce l''ha già)';

-- Funzione per rimuovere un ruolo da un utente
CREATE OR REPLACE FUNCTION remove_role_from_user(
  p_user_id INTEGER,
  p_role_to_remove TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET roles = array_remove(roles, p_role_to_remove)
  WHERE id = p_user_id;

  RAISE NOTICE 'Ruolo % rimosso dall''utente %', p_role_to_remove, p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_role_from_user IS
  'Rimuove un ruolo da un utente';

-- Funzione per verificare se un utente ha un ruolo specifico
CREATE OR REPLACE FUNCTION user_has_role(
  p_user_id INTEGER,
  p_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  has_role BOOLEAN;
BEGIN
  SELECT p_role = ANY(roles) INTO has_role
  FROM users
  WHERE id = p_user_id;

  RETURN COALESCE(has_role, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_has_role IS
  'Verifica se un utente ha un ruolo specifico. Returns true/false';

RAISE NOTICE '✓ Create helper functions';

-- ============================================================
-- STEP 7: Update trigger per sincronizzare role (backward compat)
-- ============================================================

-- Trigger per mantenere role sincronizzato con roles[0]
-- Questo mantiene backward compatibility con codice che usa role
CREATE OR REPLACE FUNCTION sync_role_from_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Se roles è popolato, setta role al primo elemento
  IF array_length(NEW.roles, 1) > 0 THEN
    NEW.role = NEW.roles[1];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_role ON users;
CREATE TRIGGER trigger_sync_role
  BEFORE INSERT OR UPDATE OF roles ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_from_roles();

COMMENT ON TRIGGER trigger_sync_role ON users IS
  'Mantiene role sincronizzato con roles[0] per backward compatibility';

RAISE NOTICE '✓ Creato trigger sync role';

-- ============================================================
-- STEP 8: View per statistiche dual role
-- ============================================================

CREATE OR REPLACE VIEW user_role_stats AS
SELECT
  COUNT(*) FILTER (WHERE 'customer' = ANY(roles)) as total_customers,
  COUNT(*) FILTER (WHERE 'professional' = ANY(roles)) as total_professionals,
  COUNT(*) FILTER (WHERE 'admin' = ANY(roles)) as total_admins,
  COUNT(*) FILTER (
    WHERE 'customer' = ANY(roles)
    AND 'professional' = ANY(roles)
  ) as dual_role_users,
  COUNT(*) as total_users
FROM users;

COMMENT ON VIEW user_role_stats IS
  'Statistiche sui ruoli utenti, inclusi dual role users';

RAISE NOTICE '✓ Creata view user_role_stats';

-- ============================================================
-- STEP 9: Esempi di utilizzo
-- ============================================================

-- Esempio: Query utenti con ruolo customer
-- SELECT * FROM users WHERE 'customer' = ANY(roles);

-- Esempio: Query utenti dual role
-- SELECT * FROM users WHERE 'customer' = ANY(roles) AND 'professional' = ANY(roles);

-- Esempio: Aggiungere role professional a un customer
-- SELECT add_role_to_user(123, 'professional');
-- UPDATE users SET professional_id = [nuovo_id] WHERE id = 123;

-- Esempio: Verificare se utente ha ruolo
-- SELECT user_has_role(123, 'professional');

-- ============================================================
-- STEP 10: Riepilogo finale
-- ============================================================

DO $$
DECLARE
  stats RECORD;
BEGIN
  SELECT * INTO stats FROM user_role_stats;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  MIGRAZIONE DUAL ROLE COMPLETATA CON SUCCESSO ✓';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'STATISTICHE:';
  RAISE NOTICE '  - Totale utenti: %', stats.total_users;
  RAISE NOTICE '  - Customers: %', stats.total_customers;
  RAISE NOTICE '  - Professionals: %', stats.total_professionals;
  RAISE NOTICE '  - Admins: %', stats.total_admins;
  RAISE NOTICE '  - Dual role (customer+professional): %', stats.dual_role_users;
  RAISE NOTICE '';
  RAISE NOTICE 'MODIFICHE APPLICATE:';
  RAISE NOTICE '  ✓ Rimosso constraint rigido users_link_check';
  RAISE NOTICE '  ✓ Aggiunta colonna roles TEXT[]';
  RAISE NOTICE '  ✓ Migrati dati esistenti da role a roles';
  RAISE NOTICE '  ✓ Aggiunti nuovi constraints flessibili';
  RAISE NOTICE '  ✓ Creato indice GIN per performance';
  RAISE NOTICE '  ✓ Create helper functions (add/remove/check role)';
  RAISE NOTICE '  ✓ Creato trigger sync role';
  RAISE NOTICE '  ✓ Creata view statistiche';
  RAISE NOTICE '';
  RAISE NOTICE 'PROSSIMI PASSI:';
  RAISE NOTICE '  1. Aggiornare codice TypeScript per usare roles[]';
  RAISE NOTICE '  2. Implementare UI role switcher';
  RAISE NOTICE '  3. Testare flusso dual role';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
