'use client'

import { X, Clock, Euro } from 'lucide-react'
import type { Service } from '@/lib/services'

interface ServicesPopupProps {
  professionalName: string
  services: Service[]
  isOpen: boolean
  onClose: () => void
  isLoading?: boolean
}

export default function ServicesPopup({
  professionalName,
  services,
  isOpen,
  onClose,
  isLoading = false,
}: ServicesPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Servizi di {professionalName}</h2>
              <p className="text-teal-50 text-sm">
                {services.length} servizio{services.length !== 1 ? 'i' : ''} disponibile{services.length !== 1 ? 'i' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              <p className="mt-4 text-gray-500">Caricamento servizi...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nessun servizio disponibile per questo professionista.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <div className="flex items-center gap-1 text-teal-600 font-bold text-lg">
                      <Euro className="w-5 h-5" />
                      <span>{service.price.toFixed(2)}</span>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {service.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{service.duration_minutes} minuti</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

