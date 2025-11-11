import { NextRequest, NextResponse } from 'next/server'
import { completeBooking, markAsNoShow, getBookingById } from '@/lib/bookings'

/**
 * POST /api/bookings/[id]/complete
 * Completa una prenotazione (o marca come no-show)
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
    const { no_show } = body

    // Verifica che booking esista
    const existingBooking = await getBookingById(bookingId)
    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking non trovato' }, { status: 404 })
    }

    if (existingBooking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Solo booking confermati possono essere completati' },
        { status: 400 }
      )
    }

    let booking

    if (no_show === true) {
      // Marca come no-show
      booking = await markAsNoShow(bookingId)
      return NextResponse.json({
        success: true,
        booking,
        message: 'Professionista marcato come no-show',
      })
    } else {
      // Completa normalmente
      booking = await completeBooking(bookingId)
      return NextResponse.json({
        success: true,
        booking,
        message: 'Prenotazione completata con successo',
      })
    }
  } catch (error: any) {
    console.error('Errore nel completamento prenotazione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nel completamento prenotazione' },
      { status: 500 }
    )
  }
}
