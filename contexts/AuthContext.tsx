'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole, userHasRole, userIsDualRole } from '@/types/user'

/**
 * Active Context - quale ruolo sta usando l'utente ora
 * Se l'utente è dual role, può switchare tra customer e professional
 */
export type ActiveContext = 'customer' | 'professional'

interface AuthContextType {
  user: User | null
  loading: boolean
  activeContext: ActiveContext
  setActiveContext: (context: ActiveContext) => void
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  // Helper functions
  hasRole: (role: UserRole) => boolean
  isDualRole: boolean
  canSwitchContext: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeContext, setActiveContextState] = useState<ActiveContext>('customer')

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const fetchedUser = data.user as User
        setUser(fetchedUser)

        // Auto-set active context basandosi sui ruoli
        if (fetchedUser.roles.includes('professional') && !fetchedUser.roles.includes('customer')) {
          setActiveContextState('professional')
        } else {
          // Default to customer se ce l'ha
          setActiveContextState('customer')
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  // Persist active context in localStorage
  useEffect(() => {
    if (user && userIsDualRole(user)) {
      const saved = localStorage.getItem('activeContext') as ActiveContext
      if (saved && user.roles.includes(saved as UserRole)) {
        setActiveContextState(saved)
      }
    }
  }, [user])

  const setActiveContext = (context: ActiveContext) => {
    if (user && user.roles.includes(context as UserRole)) {
      setActiveContextState(context)
      localStorage.setItem('activeContext', context)
    }
  }

  const login = () => {
    // Trigger per aprire modal (gestito nel componente)
    fetchUser()
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setActiveContextState('customer')
      localStorage.removeItem('activeContext')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  // Helper functions
  const hasRole = (role: UserRole): boolean => userHasRole(user, role)
  const isDualRole = userIsDualRole(user)
  const canSwitchContext = isDualRole && user?.roles.includes('customer') && user?.roles.includes('professional')

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeContext,
        setActiveContext,
        login,
        logout,
        refreshUser,
        hasRole,
        isDualRole,
        canSwitchContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
