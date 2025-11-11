import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/login
 * Login utente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      )
    }

    // Autentica
    const user = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

    // Crea sessione
    const session = await createSession(user.id)

    // Imposta cookie
    cookies().set('session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        professional_id: user.professional_id,
        customer_id: user.customer_id,
      },
    })
  } catch (error) {
    console.error('Errore login:', error)
    return NextResponse.json(
      { error: 'Errore durante il login' },
      { status: 500 }
    )
  }
}
