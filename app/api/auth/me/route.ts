import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/me
 * Ottieni utente corrente
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = cookies().get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const session = await getSession(sessionId)

    if (!session) {
      cookies().delete('session_id')
      return NextResponse.json(
        { error: 'Sessione non valida o scaduta' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        professional_id: session.user.professional_id,
        customer_id: session.user.customer_id,
        email_verified: session.user.email_verified,
      },
    })
  } catch (error) {
    console.error('Errore recupero utente:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero utente' },
      { status: 500 }
    )
  }
}
