import { NextRequest, NextResponse } from 'next/server'
import { confirmBooking, getBookingById } from '@/lib/bookings'

/**
 * POST /api/bookings/[id]/confirm
 * Conferma una prenotazione (da professionista)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    // Verifica che booking esista
    const existingBooking = await getBookingById(bookingId)
    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking non trovato' }, { status: 404 })
    }

    if (existingBooking.status !== 'pending') {
      return NextResponse.json(
        { error: `Booking già ${existingBooking.status}` },
        { status: 400 }
      )
    }

    // Conferma booking
    const booking = await confirmBooking(bookingId)

    return NextResponse.json({
      success: true,
      booking,
      message: 'Prenotazione confermata con successo',
    })
  } catch (error: any) {
    console.error('Errore nella conferma prenotazione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella conferma prenotazione' },
      { status: 500 }
    )
  }
}
