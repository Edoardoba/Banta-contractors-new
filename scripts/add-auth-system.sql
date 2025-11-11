-- ============================================================
-- ROMASERVIZI - Sistema di Autenticazione
-- ============================================================
-- Questo script crea le tabelle per gestire utenti e sessioni
--
-- Esegui con: psql -U postgres -d banta -f scripts/add-auth-system.sql
-- ============================================================

-- ============================================================
-- 1. CREA TABELLA USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',

  -- Dati personali
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Collegamento a tabelle esistenti
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL,

  -- Verifica email
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- Constraints
  CONSTRAINT users_role_check CHECK (role IN ('customer', 'professional', 'admin')),
  CONSTRAINT users_link_check CHECK (
    (role = 'customer' AND customer_id IS NOT NULL AND professional_id IS NULL) OR
    (role = 'professional' AND professional_id IS NOT NULL AND customer_id IS NULL) OR
    (role = 'admin')
  )
);

COMMENT ON TABLE users IS 'Utenti del sistema con autenticazione';
COMMENT ON COLUMN users.role IS 'customer: utente che prenota, professional: professionista con dashboard, admin: amministratore';
COMMENT ON COLUMN users.customer_id IS 'Link alla tabella customers se role=customer';
COMMENT ON COLUMN users.professional_id IS 'Link alla tabella professionals se role=professional';

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_professional_id ON users(professional_id);

-- ============================================================
-- 2. CREA TABELLA SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session data
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Device/browser info (opzionale)
  user_agent TEXT,
  ip_address VARCHAR(45)
);

COMMENT ON TABLE sessions IS 'Sessioni attive degli utenti';

-- Indici
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- 3. CREA TABELLA PASSWORD_RESET_TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE password_reset_tokens IS 'Token per reset password via email';

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- ============================================================
-- 4. CREA TABELLA EMAIL_VERIFICATION_TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE email_verification_tokens IS 'Token per verifica email al signup';

CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);

-- ============================================================
-- 5. FUNZIONE: Pulisci sessioni scadute
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Cancella sessioni scadute
  WITH deleted AS (
    DELETE FROM sessions
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Cancella sessioni scadute. Esegui via cron ogni ora';

-- ============================================================
-- 6. FUNZIONE: Pulisci token scaduti
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Cancella token password reset scaduti
  WITH deleted_reset AS (
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW()
    RETURNING id
  ),
  -- Cancella token verifica email scaduti
  deleted_verification AS (
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM deleted_reset) +
    (SELECT COUNT(*) FROM deleted_verification)
  INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Cancella token scaduti. Esegui via cron ogni giorno';

-- ============================================================
-- 7. TRIGGER: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. AGGIUNGI COLONNE A CUSTOMERS (se non esistono)
-- ============================================================

-- Aggiungi user_id a customers per collegamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX idx_customers_user_id ON customers(user_id);
  END IF;
END $$;

-- ============================================================
-- 9. AGGIUNGI COLONNE A PROFESSIONALS (se non esistono)
-- ============================================================

-- Aggiungi user_id a professionals per collegamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE professionals ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX idx_professionals_user_id ON professionals(user_id);
  END IF;
END $$;

-- ============================================================
-- 10. DATI DI ESEMPIO (opzionale - commentato)
-- ============================================================

-- Crea utente admin di esempio
-- Password: "admin123" (hash bcrypt)
-- INSERT INTO users (email, password_hash, role, name) VALUES
-- ('admin@romaservizi.it', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'Admin');

-- Crea utente customer di esempio
-- Password: "customer123"
-- Prima crea customer, poi user
-- INSERT INTO customers (name, email, phone) VALUES
-- ('Mario Rossi', 'mario@example.com', '+39 333 1234567');
--
-- INSERT INTO users (email, password_hash, role, name, phone, customer_id) VALUES
-- ('mario@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'customer', 'Mario Rossi', '+39 333 1234567', (SELECT id FROM customers WHERE email = 'mario@example.com'));

-- ============================================================
-- 11. VISTA: Users con dettagli
-- ============================================================

CREATE OR REPLACE VIEW users_with_details AS
SELECT
  u.*,
  c.id as customer_details_id,
  c.name as customer_name,
  p.id as professional_details_id,
  p.name as professional_name,
  p.category as professional_category,
  p.reliability_score as professional_reliability
FROM users u
LEFT JOIN customers c ON u.customer_id = c.id
LEFT JOIN professionals p ON u.professional_id = p.id;

COMMENT ON VIEW users_with_details IS 'Vista con join a customers/professionals per dettagli completi';

-- ============================================================
-- FINE SCRIPT
-- ============================================================

-- Verifica installazione
SELECT
  'users' AS table_name,
  COUNT(*) AS record_count
FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
UNION ALL
SELECT 'email_verification_tokens', COUNT(*) FROM email_verification_tokens;

-- Mostra struttura tabella users
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

DO $$
BEGIN
  RAISE NOTICE 'Schema autenticazione installato con successo!';
  RAISE NOTICE 'Prossimi passi:';
  RAISE NOTICE '1. Configura secret per JWT in .env.local';
  RAISE NOTICE '2. Implementa hash password con bcrypt';
  RAISE NOTICE '3. Configura cron per cleanup sessioni/token';
END $$;
