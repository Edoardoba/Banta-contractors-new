import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking, getBookingById } from '@/lib/bookings'

/**
 * POST /api/bookings/[id]/cancel
 * Cancella una prenotazione
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

    const body = await request.json()
    const { cancelled_by, reason } = body

    if (!cancelled_by || !['customer', 'professional', 'system'].includes(cancelled_by)) {
      return NextResponse.json(
        { error: 'Specificare cancelled_by (customer, professional, o system)' },
        { status: 400 }
      )
    }

    // Verifica che booking esista
    const existingBooking = await getBookingById(bookingId)
    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking non trovato' }, { status: 404 })
    }

    if (!['pending', 'confirmed'].includes(existingBooking.status)) {
      return NextResponse.json(
        { error: `Impossibile cancellare booking ${existingBooking.status}` },
        { status: 400 }
      )
    }

    // Cancella booking
    const booking = await cancelBooking(bookingId, cancelled_by, reason)

    return NextResponse.json({
      success: true,
      booking,
      message: 'Prenotazione cancellata con successo',
    })
  } catch (error: any) {
    console.error('Errore nella cancellazione prenotazione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella cancellazione prenotazione' },
      { status: 500 }
    )
  }
}
