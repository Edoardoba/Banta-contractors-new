-- ============================================================
-- HELPER: Upgrade Professional to Dual Role
-- ============================================================
-- Script helper per aggiungere ruolo customer a un professional esistente
-- Utile quando un professionista vuole fare booking come cliente
--
-- Uso:
-- SELECT upgrade_professional_to_dual_role(
--   p_user_id := [USER_ID],
--   p_customer_name := 'Nome',
--   p_customer_email := 'email@example.com',
--   p_customer_phone := '+39 333...'
-- );
-- ============================================================

CREATE OR REPLACE FUNCTION upgrade_professional_to_dual_role(
  p_user_id INTEGER,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id INTEGER,
  customer_id INTEGER,
  roles TEXT[]
) AS $$
DECLARE
  v_user RECORD;
  v_customer_id INTEGER;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
BEGIN
  -- Get user info
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Utente non trovato', NULL::INTEGER, NULL::INTEGER, NULL::TEXT[];
    RETURN;
  END IF;

  -- Verifica che sia professional
  IF NOT ('professional' = ANY(v_user.roles)) THEN
    RETURN QUERY SELECT false, 'Utente non è un professionista', p_user_id, NULL::INTEGER, v_user.roles;
    RETURN;
  END IF;

  -- Verifica se ha già customer role
  IF 'customer' = ANY(v_user.roles) THEN
    RETURN QUERY SELECT
      true,
      'Utente è già dual role',
      p_user_id,
      v_user.customer_id,
      v_user.roles;
    RETURN;
  END IF;

  -- Usa parametri o fallback su dati user
  v_customer_name := COALESCE(p_customer_name, v_user.name);
  v_customer_email := COALESCE(p_customer_email, v_user.email);
  v_customer_phone := COALESCE(p_customer_phone, v_user.phone);

  -- Verifica se esiste già un customer con questa email
  SELECT id INTO v_customer_id
  FROM customers
  WHERE email = v_customer_email;

  -- Crea customer se non esiste
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, email, phone)
    VALUES (v_customer_name, v_customer_email, v_customer_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Update user: aggiungi customer role e link customer_id
  UPDATE users
  SET
    roles = array_append(roles, 'customer'),
    customer_id = v_customer_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success
  RETURN QUERY SELECT
    true,
    format('Utente upgraded a dual role. Customer ID: %s', v_customer_id),
    p_user_id,
    v_customer_id,
    ARRAY['customer', 'professional']::TEXT[];

  RAISE NOTICE 'Professional % upgraded to dual role. Customer ID: %', p_user_id, v_customer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upgrade_professional_to_dual_role IS
  'Aggiunge ruolo customer a un professional esistente, creando customer profile se necessario';

-- ============================================================
-- ESEMPI DI UTILIZZO
-- ============================================================

-- Esempio 1: Upgrade usando dati esistenti dell'utente
-- SELECT * FROM upgrade_professional_to_dual_role(p_user_id := 123);

-- Esempio 2: Upgrade specificando dati custom
-- SELECT * FROM upgrade_professional_to_dual_role(
--   p_user_id := 123,
--   p_customer_name := 'Mario Rossi',
--   p_customer_email := 'mario.rossi@example.com',
--   p_customer_phone := '+39 333 1234567'
-- );

-- Esempio 3: Batch upgrade di tutti i professionals
-- SELECT upgrade_professional_to_dual_role(id)
-- FROM users
-- WHERE 'professional' = ANY(roles)
--   AND NOT ('customer' = ANY(roles));
