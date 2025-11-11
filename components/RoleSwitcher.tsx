'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ShoppingBag, Briefcase } from 'lucide-react'

/**
 * RoleSwitcher Component
 *
 * Permette agli utenti dual role di switchare tra modalità customer e professional
 * Mostra solo se l'utente ha entrambi i ruoli
 */
export default function RoleSwitcher() {
  const { user, activeContext, setActiveContext, canSwitchContext } = useAuth()

  // Non mostrare se utente non è dual role
  if (!canSwitchContext) {
    return null
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 animate-fadeInUp">
      <button
        onClick={() => setActiveContext('customer')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${
            activeContext === 'customer'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }
        `}
        title="Modalità Cliente - Prenota servizi"
      >
        <ShoppingBag className="w-4 h-4" />
        <span className="hidden sm:inline">Cliente</span>
      </button>

      <button
        onClick={() => setActiveContext('professional')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${
            activeContext === 'professional'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }
        `}
        title="Modalità Professionista - Gestisci prenotazioni"
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">Professionista</span>
      </button>
    </div>
  )
}
