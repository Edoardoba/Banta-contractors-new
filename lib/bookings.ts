import pool from '@/lib/db'

export interface Booking {
  id: number
  professional_id: number
  customer_id: number
  service_id: number | null
  booking_date: string
  start_time: string
  end_time: string
  notes: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
  confirmed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  cancelled_by: 'customer' | 'professional' | 'system' | null
  customer_rating: number | null
  customer_review: string | null
  reviewed_at: string | null
}

export interface CreateBookingInput {
  professional_id: number
  customer_id: number
  service_id?: number
  booking_date: string
  start_time: string
  end_time: string
  notes?: string
}

/**
 * Crea una nuova prenotazione (status: pending)
 */
export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const result = await pool.query(
    `INSERT INTO bookings (
      professional_id, customer_id, service_id,
      booking_date, start_time, end_time, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *`,
    [
      data.professional_id,
      data.customer_id,
      data.service_id || null,
      data.booking_date,
      data.start_time,
      data.end_time,
      data.notes || null,
    ]
  )

  return result.rows[0]
}

/**
 * Ottieni prenotazione per ID
 */
export async function getBookingById(id: number): Promise<Booking | null> {
  const result = await pool.query(
    'SELECT * FROM bookings WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

/**
 * Ottieni tutte le prenotazioni di un professionista
 */
export async function getBookingsByProfessional(
  professionalId: number,
  status?: Booking['status']
): Promise<Booking[]> {
  let query = 'SELECT * FROM bookings WHERE professional_id = $1'
  const params: any[] = [professionalId]

  if (status) {
    query += ' AND status = $2'
    params.push(status)
  }

  query += ' ORDER BY booking_date DESC, start_time DESC'

  const result = await pool.query(query, params)
  return result.rows
}

/**
 * Ottieni tutte le prenotazioni di un cliente
 */
export async function getBookingsByCustomer(
  customerId: number,
  status?: Booking['status']
): Promise<Booking[]> {
  let query = 'SELECT * FROM bookings WHERE customer_id = $1'
  const params: any[] = [customerId]

  if (status) {
    query += ' AND status = $2'
    params.push(status)
  }

  query += ' ORDER BY booking_date DESC, start_time DESC'

  const result = await pool.query(query, params)
  return result.rows
}

/**
 * Conferma una prenotazione (pending -> confirmed)
 */
export async function confirmBooking(id: number): Promise<Booking> {
  const result = await pool.query(
    `UPDATE bookings
    SET status = 'confirmed', confirmed_at = NOW()
    WHERE id = $1 AND status = 'pending'
    RETURNING *`,
    [id]
  )

  if (result.rows.length === 0) {
    throw new Error('Booking non trovato o già confermato')
  }

  return result.rows[0]
}

/**
 * Cancella una prenotazione
 */
export async function cancelBooking(
  id: number,
  cancelledBy: 'customer' | 'professional' | 'system',
  reason?: string
): Promise<Booking> {
  const result = await pool.query(
    `UPDATE bookings
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = $2,
        cancellation_reason = $3
    WHERE id = $1 AND status IN ('pending', 'confirmed')
    RETURNING *`,
    [id, cancelledBy, reason || null]
  )

  if (result.rows.length === 0) {
    throw new Error('Booking non trovato o già cancellato/completato')
  }

  return result.rows[0]
}

/**
 * Completa una prenotazione
 */
export async function completeBooking(id: number): Promise<Booking> {
  const result = await pool.query(
    `UPDATE bookings
    SET status = 'completed', completed_at = NOW()
    WHERE id = $1 AND status = 'confirmed'
    RETURNING *`,
    [id]
  )

  if (result.rows.length === 0) {
    throw new Error('Booking non trovato o non confermato')
  }

  return result.rows[0]
}

/**
 * Marca prenotazione come no-show
 */
export async function markAsNoShow(id: number): Promise<Booking> {
  const result = await pool.query(
    `UPDATE bookings
    SET status = 'no_show'
    WHERE id = $1 AND status = 'confirmed'
    RETURNING *`,
    [id]
  )

  if (result.rows.length === 0) {
    throw new Error('Booking non trovato o non confermato')
  }

  return result.rows[0]
}

/**
 * Aggiungi recensione a prenotazione completata
 */
export async function addReview(
  id: number,
  rating: number,
  review?: string
): Promise<Booking> {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating deve essere tra 1 e 5')
  }

  const result = await pool.query(
    `UPDATE bookings
    SET customer_rating = $2,
        customer_review = $3,
        reviewed_at = NOW()
    WHERE id = $1 AND status = 'completed'
    RETURNING *`,
    [id, rating, review || null]
  )

  if (result.rows.length === 0) {
    throw new Error('Booking non trovato o non completato')
  }

  // Aggiorna rating professionista
  const booking = result.rows[0]
  await updateProfessionalRating(booking.professional_id)

  return booking
}

/**
 * Aggiorna rating medio professionista basato su recensioni
 */
async function updateProfessionalRating(professionalId: number): Promise<void> {
  await pool.query(
    `UPDATE professionals
    SET rating = (
      SELECT COALESCE(AVG(customer_rating), 0)
      FROM bookings
      WHERE professional_id = $1
        AND customer_rating IS NOT NULL
    ),
    review_count = (
      SELECT COUNT(*)
      FROM bookings
      WHERE professional_id = $1
        AND customer_rating IS NOT NULL
    )
    WHERE id = $1`,
    [professionalId]
  )
}

/**
 * Cancella automaticamente booking non confermati (da eseguire via cron)
 */
export async function cancelUnconfirmedBookings(): Promise<number> {
  const result = await pool.query(
    'SELECT cancel_unconfirmed_bookings() as count'
  )
  return result.rows[0].count
}

/**
 * Verifica se uno slot è disponibile
 */
export async function isSlotAvailable(
  professionalId: number,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  // Controlla se esiste già una prenotazione confermata in questo slot
  const result = await pool.query(
    `SELECT COUNT(*) as count
    FROM bookings
    WHERE professional_id = $1
      AND booking_date = $2
      AND status IN ('pending', 'confirmed')
      AND (
        (start_time < $4 AND end_time > $3)
      )`,
    [professionalId, date, startTime, endTime]
  )

  const hasConflict = parseInt(result.rows[0].count) > 0

  if (hasConflict) {
    return false
  }

  // Controlla se il giorno è bloccato
  const blockedResult = await pool.query(
    `SELECT COUNT(*) as count
    FROM blocked_slots
    WHERE professional_id = $1
      AND blocked_date = $2
      AND (
        (start_time IS NULL AND end_time IS NULL) -- Giorno intero bloccato
        OR (start_time < $4 AND end_time > $3)
      )`,
    [professionalId, date, startTime, endTime]
  )

  const isBlocked = parseInt(blockedResult.rows[0].count) > 0

  return !isBlocked
}
