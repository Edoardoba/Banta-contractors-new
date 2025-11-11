import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/availability/slots
 * Ottieni slot disponibili per un professionista in una data specifica
 *
 * Query params:
 * - professional_id: ID del professionista
 * - date: Data in formato YYYY-MM-DD
 * - duration: Durata servizio in minuti (default: 60)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const professionalId = searchParams.get('professional_id')
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '60')

    if (!professionalId || !date) {
      return NextResponse.json(
        { error: 'professional_id e date sono obbligatori' },
        { status: 400 }
      )
    }

    // Valida formato data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Formato data non valido. Usa YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Ottieni giorno della settimana (0 = Domenica, 6 = Sabato)
    const dateObj = new Date(date + 'T00:00:00')
    const dayOfWeek = dateObj.getDay()

    // Ottieni disponibilità del professionista per questo giorno
    const availabilityResult = await pool.query(
      `SELECT start_time, end_time, slot_duration
       FROM availability
       WHERE professional_id = $1
         AND day_of_week = $2
         AND is_active = true`,
      [professionalId, dayOfWeek]
    )

    if (availabilityResult.rows.length === 0) {
      // Professionista non disponibile in questo giorno
      return NextResponse.json([])
    }

    const availability = availabilityResult.rows[0]
    const slotDuration = availability.slot_duration || duration

    // Genera tutti gli slot possibili
    const slots = generateTimeSlots(
      availability.start_time,
      availability.end_time,
      slotDuration
    )

    // Ottieni slot bloccati per questa data
    const blockedSlotsResult = await pool.query(
      `SELECT start_time, end_time
       FROM blocked_slots
       WHERE professional_id = $1
         AND blocked_date = $2`,
      [professionalId, date]
    )

    const blockedSlots = blockedSlotsResult.rows

    // Ottieni booking esistenti per questa data
    const bookingsResult = await pool.query(
      `SELECT start_time, end_time
       FROM bookings
       WHERE professional_id = $1
         AND booking_date = $2
         AND status IN ('pending', 'confirmed')`,
      [professionalId, date]
    )

    const existingBookings = bookingsResult.rows

    // Marca slot come disponibili o non disponibili
    const slotsWithAvailability = slots.map((slot) => {
      const slotStart = slot.time
      const slotEnd = addMinutes(slotStart, slotDuration)

      // Controlla se lo slot è bloccato
      const isBlocked = blockedSlots.some((blocked) => {
        // Se start_time e end_time sono NULL, l'intero giorno è bloccato
        if (!blocked.start_time && !blocked.end_time) {
          return true
        }
        return timeRangesOverlap(
          slotStart,
          slotEnd,
          blocked.start_time,
          blocked.end_time
        )
      })

      // Controlla se c'è già un booking
      const isBooked = existingBookings.some((booking) =>
        timeRangesOverlap(
          slotStart,
          slotEnd,
          booking.start_time,
          booking.end_time
        )
      )

      // Controlla se lo slot è nel passato (solo per oggi)
      const now = new Date()
      const isToday = date === now.toISOString().split('T')[0]
      const isPast = isToday && isPastTime(slotStart)

      return {
        time: slotStart,
        available: !isBlocked && !isBooked && !isPast,
      }
    })

    return NextResponse.json(slotsWithAvailability)
  } catch (error) {
    console.error('Errore nel recupero slot:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero slot disponibili' },
      { status: 500 }
    )
  }
}

/**
 * Genera slot di tempo tra start e end con durata specificata
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): { time: string }[] {
  const slots: { time: string }[] = []
  let current = startTime

  while (current < endTime) {
    slots.push({ time: current })
    current = addMinutes(current, durationMinutes)
  }

  return slots
}

/**
 * Aggiungi minuti a un orario in formato HH:MM
 */
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60

  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

/**
 * Controlla se due range di tempo si sovrappongono
 */
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Controlla se un orario è nel passato (solo per oggi)
 */
function isPastTime(time: string): boolean {
  const now = new Date()
  const [hours, minutes] = time.split(':').map(Number)

  const timeToCheck = new Date()
  timeToCheck.setHours(hours, minutes, 0, 0)

  return timeToCheck < now
}
