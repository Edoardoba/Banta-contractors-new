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
}

export async function getProfessionals(): Promise<Professional[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM professionals ORDER BY rating DESC, review_count DESC'
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

