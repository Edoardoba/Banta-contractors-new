import pool from '@/lib/db'

export interface Customer {
  id: number
  name: string
  email: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CreateCustomerInput {
  name: string
  email: string
  phone?: string
}

/**
 * Crea un nuovo cliente
 */
export async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  const result = await pool.query(
    `INSERT INTO customers (name, email, phone)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        updated_at = NOW()
    RETURNING *`,
    [data.name, data.email, data.phone || null]
  )

  return result.rows[0]
}

/**
 * Ottieni cliente per ID
 */
export async function getCustomerById(id: number): Promise<Customer | null> {
  const result = await pool.query(
    'SELECT * FROM customers WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

/**
 * Ottieni cliente per email
 */
export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const result = await pool.query(
    'SELECT * FROM customers WHERE email = $1',
    [email]
  )
  return result.rows[0] || null
}

/**
 * Aggiorna informazioni cliente
 */
export async function updateCustomer(
  id: number,
  data: Partial<CreateCustomerInput>
): Promise<Customer> {
  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (data.name) {
    fields.push(`name = $${paramCount++}`)
    values.push(data.name)
  }

  if (data.phone !== undefined) {
    fields.push(`phone = $${paramCount++}`)
    values.push(data.phone)
  }

  if (fields.length === 0) {
    throw new Error('Nessun campo da aggiornare')
  }

  fields.push(`updated_at = NOW()`)
  values.push(id)

  const result = await pool.query(
    `UPDATE customers SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *`,
    values
  )

  if (result.rows.length === 0) {
    throw new Error('Cliente non trovato')
  }

  return result.rows[0]
}
