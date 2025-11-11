import { NextRequest, NextResponse } from 'next/server'
import { createCustomerUser, createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/signup
 * Registrazione nuovo utente (customer)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, phone } = body

    // Validazione
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password e nome sono obbligatori' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Crea utente
    const user = await createCustomerUser({ email, password, name, phone })

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
      },
    })
  } catch (error: any) {
    console.error('Errore signup:', error)

    // Email già esistente
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Questa email è già registrata' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Errore durante la registrazione' },
      { status: 500 }
    )
  }
}
