import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/logout
 * Logout utente
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = cookies().get('session_id')?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    // Rimuovi cookie
    cookies().delete('session_id')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore logout:', error)
    return NextResponse.json(
      { error: 'Errore durante il logout' },
      { status: 500 }
    )
  }
}
