import { NextRequest, NextResponse } from 'next/server'
import { getProfessionalReliabilityStats } from '@/lib/reliability'

/**
 * GET /api/professionals/[id]/stats
 * Ottieni statistiche affidabilità di un professionista
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const professionalId = parseInt(params.id)

    if (isNaN(professionalId)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    const stats = await getProfessionalReliabilityStats(professionalId)

    if (!stats) {
      return NextResponse.json(
        { error: 'Professionista non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero statistiche' },
      { status: 500 }
    )
  }
}
