import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/professionals/onboarding
 * Registrazione completa professionista con tutti i dettagli
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect()

  try {
    const body = await request.json()

    // Estrai dati
    const {
      name,
      email,
      password,
      phone,
      category,
      description,
      address,
      image_url,
      services,
      availability,
    } = body

    // Validazione base
    if (!name || !email || !password || !phone || !category || !description || !address) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      )
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        { error: 'Aggiungi almeno un servizio' },
        { status: 400 }
      )
    }

    if (!availability || availability.length === 0) {
      return NextResponse.json(
        { error: 'Seleziona almeno un giorno di disponibilità' },
        { status: 400 }
      )
    }

    await client.query('BEGIN')

    // Geocoding semplificato: usa coordinate Roma + offset random
    // In produzione, usa API di geocoding (Google Maps, OpenStreetMap Nominatim, etc.)
    const { latitude, longitude } = geocodeAddress(address)

    // 1. Crea professional
    const professionalResult = await client.query(
      `INSERT INTO professionals (
        name, category, description, location_name,
        latitude, longitude, phone, email, image_url,
        rating, review_count, reliability_score, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 100, 'new')
      RETURNING *`,
      [
        name,
        category,
        description,
        address,
        latitude,
        longitude,
        phone,
        email,
        image_url || null,
      ]
    )

    const professional = professionalResult.rows[0]
    const professionalId = professional.id

    // 2. Crea servizi
    for (const service of services) {
      if (service.name && service.price > 0) {
        await client.query(
          `INSERT INTO services (
            professional_id, name, description, price, duration_minutes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            professionalId,
            service.name,
            service.description || null,
            service.price,
            service.duration_minutes || 60,
          ]
        )
      }
    }

    // 3. Crea disponibilità
    for (const avail of availability) {
      await client.query(
        `INSERT INTO availability (
          professional_id, day_of_week, start_time, end_time, slot_duration, is_active
        ) VALUES ($1, $2, $3, $4, 60, true)`,
        [professionalId, avail.day_of_week, avail.start_time, avail.end_time]
      )
    }

    // 4. Crea utente
    const passwordHash = hashPassword(password)
    const userResult = await client.query(
      `INSERT INTO users (
        email, password_hash, role, name, phone, professional_id
      ) VALUES ($1, $2, 'professional', $3, $4, $5)
      RETURNING *`,
      [email, passwordHash, name, phone, professionalId]
    )

    const user = userResult.rows[0]

    // 5. Update professional.user_id
    await client.query(
      `UPDATE professionals SET user_id = $1 WHERE id = $2`,
      [user.id, professionalId]
    )

    // 6. Crea sessione
    const sessionId = require('crypto').randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 giorni

    await client.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, user.id, expiresAt]
    )

    // Imposta cookie
    cookies().set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      professional: {
        id: professional.id,
        name: professional.name,
        category: professional.category,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Errore onboarding professionista:', error)

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
  } finally {
    client.release()
  }
}

/**
 * Geocoding semplificato per Roma
 * In produzione, usa API esterna
 */
function geocodeAddress(address: string): { latitude: number; longitude: number } {
  // Centro Roma con offset random per simulare indirizzi diversi
  const baseLatitude = 41.9028
  const baseLongitude = 12.4964

  // Offset random entro ~5km (circa 0.05 gradi)
  const offsetLat = (Math.random() - 0.5) * 0.05
  const offsetLng = (Math.random() - 0.5) * 0.05

  return {
    latitude: baseLatitude + offsetLat,
    longitude: baseLongitude + offsetLng,
  }
}
