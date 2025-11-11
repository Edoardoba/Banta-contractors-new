import { NextResponse } from 'next/server'
import { getServicesByProfessionalId } from '@/lib/services'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professional_id')

    if (!professionalId) {
      return NextResponse.json(
        { error: 'professional_id parameter is required' },
        { status: 400 }
      )
    }

    const services = await getServicesByProfessionalId(parseInt(professionalId))
    return NextResponse.json(services)
  } catch (error) {
    console.error('Errore nella route API servizi:', error)
    return NextResponse.json(
      { error: 'Impossibile recuperare i servizi' },
      { status: 500 }
    )
  }
}

