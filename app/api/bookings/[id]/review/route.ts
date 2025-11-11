import { NextRequest, NextResponse } from 'next/server'
import { addReview, getBookingById } from '@/lib/bookings'

/**
 * POST /api/bookings/[id]/review
 * Aggiungi recensione a prenotazione completata
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
    const { rating, review } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating deve essere tra 1 e 5' },
        { status: 400 }
      )
    }

    // Verifica che booking esista e sia completato
    const existingBooking = await getBookingById(bookingId)
    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking non trovato' }, { status: 404 })
    }

    if (existingBooking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Solo booking completati possono essere recensiti' },
        { status: 400 }
      )
    }

    if (existingBooking.customer_rating) {
      return NextResponse.json(
        { error: 'Questo booking è già stato recensito' },
        { status: 400 }
      )
    }

    // Aggiungi recensione
    const booking = await addReview(bookingId, rating, review)

    return NextResponse.json({
      success: true,
      booking,
      message: 'Recensione aggiunta con successo',
    })
  } catch (error: any) {
    console.error('Errore nell\'aggiunta recensione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nell\'aggiunta recensione' },
      { status: 500 }
    )
  }
}
