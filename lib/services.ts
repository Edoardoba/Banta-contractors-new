import pool from '@/lib/db'

export interface Service {
  id: number
  professional_id: number
  name: string
  description: string | null
  price: number
  duration_minutes: number | null
  created_at: Date
  updated_at: Date
}

export async function getServicesByProfessionalId(professionalId: number): Promise<Service[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE professional_id = $1 ORDER BY price ASC',
      [professionalId]
    )
    // Convert DECIMAL types from PostgreSQL to numbers
    return result.rows.map((row) => ({
      ...row,
      price: parseFloat(row.price) || 0,
      duration_minutes: row.duration_minutes ? parseInt(row.duration_minutes) : null,
    }))
  } catch (error) {
    console.error('Errore nel recupero dei servizi:', error)
    return []
  }
}

export async function getAllServices(): Promise<Service[]> {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY professional_id, price ASC')
    // Convert DECIMAL types from PostgreSQL to numbers
    return result.rows.map((row) => ({
      ...row,
      price: parseFloat(row.price) || 0,
      duration_minutes: row.duration_minutes ? parseInt(row.duration_minutes) : null,
    }))
  } catch (error) {
    console.error('Errore nel recupero di tutti i servizi:', error)
    return []
  }
}

