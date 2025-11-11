import pool from '@/lib/db'
import { randomBytes, createHash } from 'crypto'

export interface User {
  id: number
  email: string
  role: 'customer' | 'professional' | 'admin'
  name: string
  phone: string | null
  customer_id: number | null
  professional_id: number | null
  email_verified: boolean
  created_at: string
  last_login_at: string | null
}

export interface Session {
  id: string
  user_id: number
  expires_at: string
  user: User
}

/**
 * Hash password usando crypto nativo (per evitare dipendenza bcrypt)
 * In produzione, usa bcrypt!
 */
export function hashPassword(password: string): string {
  // Genera salt
  const salt = randomBytes(16).toString('hex')
  // Hash password con salt
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  // Ritorna salt:hash
  return `${salt}:${hash}`
}

/**
 * Verifica password
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  const testHash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return hash === testHash
}

/**
 * Genera session ID random
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Genera token random
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Crea sessione per utente
 */
export async function createSession(
  userId: number,
  expiresInHours: number = 24 * 7 // 7 giorni default
): Promise<Session> {
  const sessionId = generateSessionId()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresInHours)

  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [sessionId, userId, expiresAt]
  )

  // Update last_login_at
  await pool.query(
    `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
    [userId]
  )

  const user = await getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  return {
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    user,
  }
}

/**
 * Ottieni sessione per ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await pool.query(
    `SELECT s.*, u.*
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]

  return {
    id: row.id,
    user_id: row.user_id,
    expires_at: row.expires_at,
    user: {
      id: row.user_id,
      email: row.email,
      role: row.role,
      name: row.name,
      phone: row.phone,
      customer_id: row.customer_id,
      professional_id: row.professional_id,
      email_verified: row.email_verified,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
    },
  }
}

/**
 * Cancella sessione
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId])
}

/**
 * Cancella tutte le sessioni di un utente
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
}

/**
 * Ottieni utente per ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0]
}

/**
 * Ottieni utente per email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  )

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0]
}

/**
 * Crea nuovo utente (customer)
 */
export async function createCustomerUser(data: {
  email: string
  password: string
  name: string
  phone?: string
}): Promise<User> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Crea customer
    const customerResult = await client.query(
      `INSERT INTO customers (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [data.name, data.email, data.phone || null]
    )

    const customerId = customerResult.rows[0].id

    // 2. Crea user
    const passwordHash = hashPassword(data.password)
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, name, phone, customer_id)
       VALUES ($1, $2, 'customer', $3, $4, $5)
       RETURNING *`,
      [data.email, passwordHash, data.name, data.phone || null, customerId]
    )

    // 3. Update customer.user_id
    await client.query(
      `UPDATE customers SET user_id = $1 WHERE id = $2`,
      [userResult.rows[0].id, customerId]
    )

    await client.query('COMMIT')

    return userResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Crea nuovo utente (professional)
 */
export async function createProfessionalUser(data: {
  email: string
  password: string
  professionalId: number
}): Promise<User> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Ottieni dati professional
    const professionalResult = await client.query(
      `SELECT name, phone FROM professionals WHERE id = $1`,
      [data.professionalId]
    )

    if (professionalResult.rows.length === 0) {
      throw new Error('Professional not found')
    }

    const professional = professionalResult.rows[0]

    // Crea user
    const passwordHash = hashPassword(data.password)
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, name, phone, professional_id)
       VALUES ($1, $2, 'professional', $3, $4, $5)
       RETURNING *`,
      [
        data.email,
        passwordHash,
        professional.name,
        professional.phone,
        data.professionalId,
      ]
    )

    // Update professional.user_id
    await client.query(
      `UPDATE professionals SET user_id = $1 WHERE id = $2`,
      [userResult.rows[0].id, data.professionalId]
    )

    await client.query('COMMIT')

    return userResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Autentica utente
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  )

  if (result.rows.length === 0) {
    return null
  }

  const user = result.rows[0]

  if (!verifyPassword(password, user.password_hash)) {
    return null
  }

  return user
}

/**
 * Crea token reset password
 */
export async function createPasswordResetToken(
  userId: number
): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24 ore

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  )

  return token
}

/**
 * Verifica e usa token reset password
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<number | null> {
  const result = await pool.query(
    `SELECT user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  )

  if (result.rows.length === 0) {
    return null
  }

  const tokenData = result.rows[0]

  // Verifica se già usato
  if (tokenData.used_at) {
    return null
  }

  // Verifica se scaduto
  if (new Date(tokenData.expires_at) < new Date()) {
    return null
  }

  // Marca come usato
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  )

  return tokenData.user_id
}

/**
 * Reset password
 */
export async function resetPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const passwordHash = hashPassword(newPassword)

  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  )

  // Cancella tutte le sessioni esistenti
  await deleteAllUserSessions(userId)
}
