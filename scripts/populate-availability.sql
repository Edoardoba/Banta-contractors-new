-- ============================================================
-- Script per Popolare Disponibilità di Esempio
-- ============================================================
-- Questo script aggiunge disponibilità settimanale per tutti i professionisti
--
-- Esegui con: psql -U postgres -d banta -f scripts/populate-availability.sql
-- ============================================================

-- Cancella disponibilità esistenti (opzionale)
-- TRUNCATE availability;

-- Aggiungi disponibilità per tutti i professionisti esistenti
-- Lunedì-Venerdì 9:00-18:00, slot da 60 minuti

INSERT INTO availability (professional_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT
  p.id as professional_id,
  day_of_week,
  '09:00' as start_time,
  '18:00' as end_time,
  60 as slot_duration,
  true as is_active
FROM professionals p
CROSS JOIN (
  SELECT 1 as day_of_week  -- Lunedì
  UNION SELECT 2  -- Martedì
  UNION SELECT 3  -- Mercoledì
  UNION SELECT 4  -- Giovedì
  UNION SELECT 5  -- Venerdì
) days
ON CONFLICT (professional_id, day_of_week, start_time, end_time) DO NOTHING;

-- Aggiungi anche sabato mattina per alcuni (9:00-13:00)
INSERT INTO availability (professional_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT
  p.id as professional_id,
  6 as day_of_week,  -- Sabato
  '09:00' as start_time,
  '13:00' as end_time,
  60 as slot_duration,
  true as is_active
FROM professionals p
ON CONFLICT (professional_id, day_of_week, start_time, end_time) DO NOTHING;

-- Mostra risultato
SELECT
  p.name,
  a.day_of_week,
  CASE a.day_of_week
    WHEN 0 THEN 'Domenica'
    WHEN 1 THEN 'Lunedì'
    WHEN 2 THEN 'Martedì'
    WHEN 3 THEN 'Mercoledì'
    WHEN 4 THEN 'Giovedì'
    WHEN 5 THEN 'Venerdì'
    WHEN 6 THEN 'Sabato'
  END as giorno,
  a.start_time,
  a.end_time,
  a.slot_duration as durata_slot_minuti
FROM availability a
JOIN professionals p ON a.professional_id = p.id
ORDER BY p.id, a.day_of_week;

RAISE NOTICE 'Disponibilità popolate con successo!';
