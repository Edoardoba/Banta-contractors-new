-- ============================================================
-- ROMASERVIZI - Sistema di Prenotazioni e Affidabilità
-- ============================================================
-- Questo script aggiunge tutto il necessario per il sistema di booking
-- con tracking affidabilità e scoring professionisti
--
-- Esegui con: psql -U postgres -d banta -f scripts/add-booking-system.sql
-- ============================================================

-- ============================================================
-- 1. AGGIUNGI COLONNE AFFIDABILITÀ A PROFESSIONALS
-- ============================================================

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_confirm_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Aggiungi constraint per status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professionals_status_check'
  ) THEN
    ALTER TABLE professionals
    ADD CONSTRAINT professionals_status_check
    CHECK (status IN ('new', 'verified', 'premium', 'suspended'));
  END IF;
END $$;

-- Aggiungi constraint per reliability_score
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professionals_reliability_check'
  ) THEN
    ALTER TABLE professionals
    ADD CONSTRAINT professionals_reliability_check
    CHECK (reliability_score >= 0 AND reliability_score <= 100);
  END IF;
END $$;

COMMENT ON COLUMN professionals.reliability_score IS 'Punteggio affidabilità (0-100). <40=sospensione, <60=degradato, >90=premium';
COMMENT ON COLUMN professionals.status IS 'new: <10 prenotazioni, verified: 10+ con 90%+ affidabilità, premium: 50+ con 95%+, suspended: bannato';
COMMENT ON COLUMN professionals.auto_confirm_enabled IS 'Se true, prenotazioni confermate automaticamente (solo per verified/premium)';

-- ============================================================
-- 2. CREA TABELLA CUSTOMERS (Clienti)
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Clienti che prenotano servizi';

-- ============================================================
-- 3. CREA TABELLA BOOKINGS (Prenotazioni)
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,

  -- Dettagli prenotazione
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',

  -- Timestamps importanti
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Motivo cancellazione
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20), -- 'customer', 'professional', 'system'

  -- Review (dopo completamento)
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_review TEXT,
  reviewed_at TIMESTAMP,

  CONSTRAINT bookings_status_check CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  CONSTRAINT bookings_cancelled_by_check CHECK (
    cancelled_by IN ('customer', 'professional', 'system', NULL)
  )
);

COMMENT ON TABLE bookings IS 'Prenotazioni tra clienti e professionisti';
COMMENT ON COLUMN bookings.status IS 'pending: in attesa conferma, confirmed: confermato, completed: completato, cancelled: cancellato, no_show: professionista non si è presentato';
COMMENT ON COLUMN bookings.cancelled_by IS 'Chi ha cancellato: customer, professional, o system (timeout conferma)';

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_bookings_professional ON bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ============================================================
-- 4. CREA TABELLA AVAILABILITY (Disponibilità Professionisti)
-- ============================================================

CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

  -- Giorno della settimana (0 = Domenica, 6 = Sabato)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Orari
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Slot duration in minutes
  slot_duration INTEGER DEFAULT 60,

  -- Active/inactive
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(professional_id, day_of_week, start_time, end_time)
);

COMMENT ON TABLE availability IS 'Disponibilità settimanale ricorrente dei professionisti';
COMMENT ON COLUMN availability.day_of_week IS '0=Domenica, 1=Lunedì, 2=Martedì, 3=Mercoledì, 4=Giovedì, 5=Venerdì, 6=Sabato';
COMMENT ON COLUMN availability.slot_duration IS 'Durata di ogni slot in minuti (default 60)';

CREATE INDEX IF NOT EXISTS idx_availability_professional ON availability(professional_id);

-- ============================================================
-- 5. CREA TABELLA BLOCKED_SLOTS (Slot bloccati/eccezioni)
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

  -- Data specifica bloccata
  blocked_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  -- NULL start_time/end_time = giorno intero bloccato
  reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(professional_id, blocked_date, start_time, end_time)
);

COMMENT ON TABLE blocked_slots IS 'Giorni o slot specifici bloccati (es: ferie, malattia)';

CREATE INDEX IF NOT EXISTS idx_blocked_slots_professional ON blocked_slots(professional_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(blocked_date);

-- ============================================================
-- 6. CREA TABELLA RELIABILITY_LOG (Log modifiche affidabilità)
-- ============================================================

CREATE TABLE IF NOT EXISTS reliability_log (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,

  -- Cambio punteggio
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  score_change INTEGER NOT NULL,

  -- Motivo
  reason VARCHAR(100) NOT NULL,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE reliability_log IS 'Log storico di tutti i cambiamenti al reliability_score';
COMMENT ON COLUMN reliability_log.reason IS 'es: no_show, late_cancel, completed, perfect_streak';

CREATE INDEX IF NOT EXISTS idx_reliability_log_professional ON reliability_log(professional_id);
CREATE INDEX IF NOT EXISTS idx_reliability_log_created_at ON reliability_log(created_at);

-- ============================================================
-- 7. FUNZIONE: Calcola Percentuale Completamenti
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_completion_rate(prof_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
BEGIN
  SELECT total_bookings, completed_bookings
  INTO total_count, completed_count
  FROM professionals
  WHERE id = prof_id;

  IF total_count = 0 THEN
    RETURN 100.0;
  END IF;

  RETURN ROUND((completed_count::NUMERIC / total_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_completion_rate IS 'Calcola percentuale prenotazioni completate con successo';

-- ============================================================
-- 8. FUNZIONE: Aggiorna Reliability Score
-- ============================================================

CREATE OR REPLACE FUNCTION update_reliability_score(
  prof_id INTEGER,
  score_delta INTEGER,
  reason_text VARCHAR(100),
  booking_ref INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  old_score INTEGER;
  new_score INTEGER;
  old_status VARCHAR(20);
  new_status VARCHAR(20);
BEGIN
  -- Ottieni score attuale
  SELECT reliability_score, status
  INTO old_score, old_status
  FROM professionals
  WHERE id = prof_id;

  -- Calcola nuovo score (min 0, max 100)
  new_score := GREATEST(0, LEAST(100, old_score + score_delta));

  -- Aggiorna score
  UPDATE professionals
  SET reliability_score = new_score,
      updated_at = NOW()
  WHERE id = prof_id;

  -- Log del cambiamento
  INSERT INTO reliability_log (
    professional_id, booking_id, previous_score, new_score, score_change, reason
  ) VALUES (
    prof_id, booking_ref, old_score, new_score, score_delta, reason_text
  );

  -- Determina nuovo status basato su score
  IF new_score < 40 THEN
    new_status := 'suspended';
  ELSIF old_status = 'suspended' AND new_score >= 60 THEN
    new_status := 'new'; -- Riabilitato ma torna a new
  ELSIF old_status = 'new' AND new_score >= 90 AND (SELECT total_bookings FROM professionals WHERE id = prof_id) >= 10 THEN
    new_status := 'verified';
  ELSIF old_status = 'verified' AND new_score >= 95 AND (SELECT total_bookings FROM professionals WHERE id = prof_id) >= 50 THEN
    new_status := 'premium';
  ELSE
    new_status := old_status;
  END IF;

  -- Aggiorna status se cambiato
  IF new_status != old_status THEN
    UPDATE professionals SET status = new_status WHERE id = prof_id;
  END IF;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_reliability_score IS 'Aggiorna reliability_score e gestisce cambio status automatico';

-- ============================================================
-- 9. TRIGGER: Auto-aggiorna contatori quando booking cambia status
-- ============================================================

CREATE OR REPLACE FUNCTION update_professional_booking_stats()
RETURNS TRIGGER AS $$
DECLARE
  score_change INTEGER := 0;
  change_reason VARCHAR(100);
BEGIN
  -- Quando booking passa a confirmed
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE professionals
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.professional_id;

  -- Quando booking completato con successo
  ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE professionals
    SET completed_bookings = completed_bookings + 1
    WHERE id = NEW.professional_id;

    -- Bonus punti per completamento
    score_change := 2;
    change_reason := 'completed_booking';

  -- Quando professionista cancella
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.cancelled_by = 'professional' THEN
    UPDATE professionals
    SET cancelled_bookings = cancelled_bookings + 1
    WHERE id = NEW.professional_id;

    -- Penalità basata su quando cancella
    IF NEW.cancelled_at > (NEW.booking_date - INTERVAL '24 hours') THEN
      score_change := -10; -- Cancella ultimo minuto
      change_reason := 'late_cancellation';
    ELSE
      score_change := -5; -- Cancella con preavviso
      change_reason := 'cancellation_with_notice';
    END IF;

  -- Quando professionista non si presenta
  ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    UPDATE professionals
    SET no_show_count = no_show_count + 1
    WHERE id = NEW.professional_id;

    -- Penalità grave
    score_change := -20;
    change_reason := 'no_show';

  -- Quando system cancella per timeout conferma
  ELSIF NEW.status = 'cancelled' AND NEW.cancelled_by = 'system' THEN
    score_change := -5;
    change_reason := 'confirmation_timeout';
  END IF;

  -- Applica cambio score se necessario
  IF score_change != 0 THEN
    PERFORM update_reliability_score(NEW.professional_id, score_change, change_reason, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_update_professional_stats ON bookings;
CREATE TRIGGER trigger_update_professional_stats
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_booking_stats();

COMMENT ON TRIGGER trigger_update_professional_stats ON bookings IS 'Auto-aggiorna statistiche e score quando status booking cambia';

-- ============================================================
-- 10. FUNZIONE: Cancella automaticamente booking non confermati
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_unconfirmed_bookings()
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  -- Cancella booking in pending da più di 2 ore
  WITH cancelled AS (
    UPDATE bookings
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = 'system',
      cancellation_reason = 'Professionista non ha confermato entro 2 ore'
    WHERE
      status = 'pending'
      AND created_at < NOW() - INTERVAL '2 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO cancelled_count FROM cancelled;

  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_unconfirmed_bookings IS 'Cancella booking pending da più di 2 ore. Esegui via cron job ogni 15 minuti';

-- ============================================================
-- 11. VISTA: Professionisti con Statistiche Affidabilità
-- ============================================================

CREATE OR REPLACE VIEW professionals_with_stats AS
SELECT
  p.*,
  CASE
    WHEN p.total_bookings = 0 THEN 100.0
    ELSE ROUND((p.completed_bookings::NUMERIC / p.total_bookings::NUMERIC) * 100, 2)
  END AS completion_rate,
  CASE
    WHEN p.total_bookings = 0 THEN 0.0
    ELSE ROUND((p.cancelled_bookings::NUMERIC / p.total_bookings::NUMERIC) * 100, 2)
  END AS cancellation_rate,
  CASE
    WHEN p.status = 'new' THEN 0
    WHEN p.status = 'verified' THEN 1
    WHEN p.status = 'premium' THEN 2
    ELSE -1
  END AS status_rank
FROM professionals p;

COMMENT ON VIEW professionals_with_stats IS 'Vista con statistiche calcolate per ogni professionista';

-- ============================================================
-- 12. DATI DI ESEMPIO (opzionale - commentato)
-- ============================================================

-- Esempio customer
-- INSERT INTO customers (name, email, phone) VALUES
-- ('Mario Rossi', 'mario.rossi@example.com', '+39 333 1234567'),
-- ('Laura Bianchi', 'laura.bianchi@example.com', '+39 347 7654321');

-- Esempio availability (Lunedì-Venerdì 9-18)
-- INSERT INTO availability (professional_id, day_of_week, start_time, end_time, slot_duration) VALUES
-- (1, 1, '09:00', '18:00', 60), -- Lunedì
-- (1, 2, '09:00', '18:00', 60), -- Martedì
-- (1, 3, '09:00', '18:00', 60), -- Mercoledì
-- (1, 4, '09:00', '18:00', 60), -- Giovedì
-- (1, 5, '09:00', '18:00', 60); -- Venerdì

-- ============================================================
-- 13. GRANT PERMISSIONS (se necessario)
-- ============================================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================
-- FINE SCRIPT
-- ============================================================

-- Verifica installazione
SELECT
  'professionals' AS table_name,
  COUNT(*) AS record_count
FROM professionals
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'availability', COUNT(*) FROM availability
UNION ALL
SELECT 'blocked_slots', COUNT(*) FROM blocked_slots;

-- Mostra nuove colonne professionals
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'professionals'
  AND column_name IN (
    'reliability_score',
    'total_bookings',
    'completed_bookings',
    'cancelled_bookings',
    'no_show_count',
    'auto_confirm_enabled',
    'status'
  )
ORDER BY ordinal_position;

RAISE NOTICE 'Schema booking system installato con successo!';
