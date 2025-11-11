import { NextRequest, NextResponse } from 'next/server'
import { cancelUnconfirmedBookings } from '@/lib/bookings'

/**
 * GET /api/cron/cancel-unconfirmed
 *
 * Cancella automaticamente prenotazioni non confermate da più di 2 ore
 *
 * IMPORTANTE: Questo endpoint dovrebbe essere chiamato da un cron job ogni 15 minuti
 *
 * Configurazione cron job (opzioni):
 *
 * 1. Con crontab Linux:
 *    */
/*15 * * * * curl https://your-domain.com/api/cron/cancel-unconfirmed?secret=YOUR_SECRET
 *
 * 2. Con Vercel Cron Jobs:
 *    Aggiungi a vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/cancel-unconfirmed",
 *        "schedule": "*/
/*15 * * * *"
 *      }]
 *    }
 *
 * 3. Con servizi esterni (es. cron-job.org, EasyCron)
 *
 * Autenticazione:
 * - Usa query param ?secret=YOUR_SECRET per proteggere endpoint
 * - Imposta CRON_SECRET in .env.local
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione (opzionale ma raccomandato)
    const authHeader = request.headers.get('authorization')
    const secretParam = request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret) {
      const isAuthenticated =
        authHeader === `Bearer ${expectedSecret}` || secretParam === expectedSecret

      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Non autorizzato' },
          { status: 401 }
        )
      }
    }

    // Esegui cancellazione automatica
    const cancelledCount = await cancelUnconfirmedBookings()

    return NextResponse.json({
      success: true,
      cancelled_count: cancelledCount,
      timestamp: new Date().toISOString(),
      message: `${cancelledCount} prenotazioni non confermate cancellate`,
    })
  } catch (error) {
    console.error('Errore nella cancellazione automatica:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione automatica' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/cancel-unconfirmed
 * Stesso comportamento di GET (per compatibilità con alcuni servizi cron)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
