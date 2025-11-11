import pool from '@/lib/db'

export interface Professional {
  id: number
  name: string
  category: string
  description: string
  location_name: string
  latitude: number
  longitude: number
  price_range: string | null
  rating: number
  review_count: number
  image_url: string | null
  // Campi affidabilità
  reliability_score?: number
  total_bookings?: number
  completed_bookings?: number
  status?: 'new' | 'verified' | 'premium' | 'suspended'
  completion_rate?: number
}

export async function getProfessionals(): Promise<Professional[]> {
  try {
    const result = await pool.query(
      `SELECT
        p.*,
        CASE
          WHEN p.total_bookings = 0 THEN 100.0
          ELSE ROUND((p.completed_bookings::NUMERIC / p.total_bookings::NUMERIC) * 100, 2)
        END as completion_rate
      FROM professionals p
      WHERE p.status != 'suspended'
      ORDER BY
        CASE p.status
          WHEN 'premium' THEN 1
          WHEN 'verified' THEN 2
          WHEN 'new' THEN 3
          ELSE 4
        END,
        p.reliability_score DESC,
        p.rating DESC,
        p.review_count DESC`
    )
    // Convert DECIMAL types from PostgreSQL to numbers
    return result.rows.map((row) => ({
      ...row,
      rating: parseFloat(row.rating) || 0,
      review_count: parseInt(row.review_count) || 0,
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      reliability_score: parseInt(row.reliability_score) || 100,
      total_bookings: parseInt(row.total_bookings) || 0,
      completed_bookings: parseInt(row.completed_bookings) || 0,
      completion_rate: parseFloat(row.completion_rate) || 100,
    }))
  } catch (error) {
    console.error('Errore nel recupero dei professionisti:', error)
    return []
  }
}

export async function getProfessionalsByCategory(category: string): Promise<Professional[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM professionals WHERE category = $1 ORDER BY rating DESC',
      [category]
    )
    // Convert DECIMAL types from PostgreSQL to numbers
    return result.rows.map((row) => ({
      ...row,
      rating: parseFloat(row.rating) || 0,
      review_count: parseInt(row.review_count) || 0,
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
    }))
  } catch (error) {
    console.error('Errore nel recupero dei professionisti per categoria:', error)
    return []
  }
}

export async function searchProfessionals(searchTerm: string): Promise<Professional[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM professionals 
       WHERE name ILIKE $1 OR category ILIKE $1 OR description ILIKE $1 
       ORDER BY rating DESC`,
      [`%${searchTerm}%`]
    )
    // Convert DECIMAL types from PostgreSQL to numbers
    return result.rows.map((row) => ({
      ...row,
      rating: parseFloat(row.rating) || 0,
      review_count: parseInt(row.review_count) || 0,
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
    }))
  } catch (error) {
    console.error('Errore nella ricerca dei professionisti:', error)
    return []
  }
}

