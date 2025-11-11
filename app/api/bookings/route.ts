import { NextRequest, NextResponse } from 'next/server'
import {
  createBooking,
  getBookingsByProfessional,
  getBookingsByCustomer,
  isSlotAvailable,
} from '@/lib/bookings'
import { createCustomer, getCustomerByEmail } from '@/lib/customers'

/**
 * GET /api/bookings
 * Ottieni prenotazioni per professionista o cliente
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const professionalId = searchParams.get('professional_id')
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status') as any

    if (professionalId) {
      const bookings = await getBookingsByProfessional(
        parseInt(professionalId),
        status
      )
      return NextResponse.json(bookings)
    }

    if (customerId) {
      const bookings = await getBookingsByCustomer(parseInt(customerId), status)
      return NextResponse.json(bookings)
    }

    return NextResponse.json(
      { error: 'Specificare professional_id o customer_id' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Errore nel recupero prenotazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prenotazioni' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings
 * Crea una nuova prenotazione
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validazione input
    const {
      professional_id,
      booking_date,
      start_time,
      end_time,
      service_id,
      notes,
      customer_name,
      customer_email,
      customer_phone,
    } = body

    if (
      !professional_id ||
      !booking_date ||
      !start_time ||
      !end_time ||
      !customer_name ||
      !customer_email
    ) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      )
    }

    // Verifica disponibilità slot
    const available = await isSlotAvailable(
      professional_id,
      booking_date,
      start_time,
      end_time
    )

    if (!available) {
      return NextResponse.json(
        { error: 'Slot non disponibile' },
        { status: 409 }
      )
    }

    // Crea o recupera cliente
    let customer = await getCustomerByEmail(customer_email)
    if (!customer) {
      customer = await createCustomer({
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
      })
    }

    // Crea prenotazione
    const booking = await createBooking({
      professional_id,
      customer_id: customer.id,
      service_id,
      booking_date,
      start_time,
      end_time,
      notes,
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione prenotazione:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione prenotazione' },
      { status: 500 }
    )
  }
}
