import { NextResponse } from 'next/server'
import { getProfessionals } from '@/lib/professionals'

export async function GET() {
  try {
    const professionals = await getProfessionals()
    return NextResponse.json(professionals)
  } catch (error) {
    console.error('Errore nella route API:', error)
    return NextResponse.json(
      { error: 'Impossibile recuperare i professionisti' },
      { status: 500 }
    )
  }
}

