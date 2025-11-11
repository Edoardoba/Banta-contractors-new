/**
 * Script di Test per Sistema Timeout
 *
 * Questo script testa il sistema di cancellazione automatica
 * delle prenotazioni non confermate.
 *
 * Uso:
 * ts-node scripts/test-timeout-system.ts
 */

import pool from '../lib/db'

async function testTimeoutSystem() {
  console.log('🧪 Test Sistema Timeout - Inizio\n')

  try {
    // 1. Crea una prenotazione di test (backdated di 3 ore)
    console.log('1. Creando prenotazione di test (3 ore fa)...')

    const testBookingResult = await pool.query(
      `INSERT INTO bookings (
        professional_id,
        customer_id,
        booking_date,
        start_time,
        end_time,
        status,
        created_at
      )
      SELECT
        p.id,
        c.id,
        CURRENT_DATE + 1,
        '10:00',
        '11:00',
        'pending',
        NOW() - INTERVAL '3 hours'
      FROM professionals p, customers c
      LIMIT 1
      RETURNING *`
    )

    if (testBookingResult.rows.length === 0) {
      console.log('❌ Nessun professionista o cliente trovato. Esegui prima populate-services.ts')
      return
    }

    const testBooking = testBookingResult.rows[0]
    console.log(`✅ Booking test creato: ID ${testBooking.id}\n`)

    // 2. Mostra booking pending prima della cancellazione
    const beforeResult = await pool.query(
      `SELECT
        id,
        status,
        created_at,
        NOW() - created_at as age
      FROM bookings
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 5`
    )

    console.log('2. Booking pending (prima della cancellazione):')
    console.table(beforeResult.rows)

    // 3. Esegui funzione di cancellazione automatica
    console.log('\n3. Eseguendo cancel_unconfirmed_bookings()...')

    const cancelResult = await pool.query(
      'SELECT cancel_unconfirmed_bookings() as cancelled_count'
    )

    const cancelledCount = cancelResult.rows[0].cancelled_count
    console.log(`✅ ${cancelledCount} booking(s) cancellati\n`)

    // 4. Mostra booking dopo la cancellazione
    const afterResult = await pool.query(
      `SELECT
        id,
        status,
        cancelled_by,
        cancellation_reason,
        created_at,
        cancelled_at
      FROM bookings
      WHERE id = $1`,
      [testBooking.id]
    )

    console.log('4. Booking dopo cancellazione:')
    console.table(afterResult.rows)

    // 5. Verifica cambio reliability_score
    const professionalResult = await pool.query(
      `SELECT
        id,
        name,
        reliability_score,
        total_bookings,
        completed_bookings,
        cancelled_bookings
      FROM professionals
      WHERE id = $1`,
      [testBooking.professional_id]
    )

    console.log('\n5. Statistiche professionista:')
    console.table(professionalResult.rows)

    // 6. Mostra log affidabilità
    const logResult = await pool.query(
      `SELECT
        id,
        previous_score,
        new_score,
        score_change,
        reason,
        created_at
      FROM reliability_log
      WHERE professional_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
      [testBooking.professional_id]
    )

    console.log('\n6. Log affidabilità (ultimi 5):')
    console.table(logResult.rows)

    console.log('\n✅ Test completato con successo!')
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error)
  } finally {
    await pool.end()
  }
}

// Esegui test
testTimeoutSystem()
