/**
 * User Types - Dual Role Support
 *
 * Gli utenti possono avere multipli ruoli contemporaneamente
 */

export type UserRole = 'customer' | 'professional' | 'admin'

export interface User {
  id: number
  email: string
  name: string
  phone?: string

  // Ruoli (array - supporta dual role)
  roles: UserRole[]

  // Role singolo (deprecated - manteniamo per backward compatibility)
  // Questo è sincronizzato con roles[0] via trigger database
  role: UserRole

  // Link ai profili
  customer_id?: number
  professional_id?: number

  // Verifica email
  email_verified: boolean
  email_verified_at?: string

  // Timestamps
  created_at: string
  updated_at: string
  last_login_at?: string
}

/**
 * Helper per verificare se un utente ha un ruolo specifico
 */
export function userHasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false
  return user.roles.includes(role)
}

/**
 * Helper per verificare se un utente è dual role
 */
export function userIsDualRole(user: User | null): boolean {
  if (!user) return false
  return user.roles.length > 1
}

/**
 * Helper per verificare se un utente può fare booking
 */
export function userCanBook(user: User | null): boolean {
  return userHasRole(user, 'customer')
}

/**
 * Helper per verificare se un utente può accedere alla dashboard professional
 */
export function userCanAccessProfessionalDashboard(user: User | null): boolean {
  return userHasRole(user, 'professional')
}

/**
 * Helper per ottenere i ruoli mancanti (per upgrade)
 */
export function getMissingRoles(user: User | null): UserRole[] {
  if (!user) return ['customer', 'professional']

  const allRoles: UserRole[] = ['customer', 'professional']
  return allRoles.filter(role => !user.roles.includes(role))
}
