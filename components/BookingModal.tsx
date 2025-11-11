'use client'

import { useState } from 'react'
import { X, Calendar, Clock, User, Mail, Phone, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import type { Professional } from '@/lib/professionals'
import type { Service } from '@/lib/services'
import BookingCalendar from './BookingCalendar'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  professional: Professional
  service?: Service
}

export default function BookingModal({
  isOpen,
  onClose,
  professional,
  service,
}: BookingModalProps) {
  const [step, setStep] = useState<'calendar' | 'details' | 'success'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const handleSlotSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setStep('details')
  }

  const handleBack = () => {
    setStep('calendar')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome obbligatorio'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }

    if (formData.phone.trim() && !/^[\d\s\+\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Telefono non valido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!selectedDate || !selectedTime) return

    setLoading(true)

    try {
      // Calcola end_time basato su durata servizio
      const serviceDuration = service?.duration_minutes || 60
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const endMinutes = hours * 60 + minutes + serviceDuration
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professional.id,
          service_id: service?.id,
          booking_date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          notes: formData.notes,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
        }),
      })

      if (response.ok) {
        const booking = await response.json()
        setBookingId(booking.id)
        setStep('success')
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella prenotazione')
      }
    } catch (error) {
      console.error('Errore nella prenotazione:', error)
      alert('Errore nella prenotazione')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('calendar')
    setSelectedDate(null)
    setSelectedTime(null)
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setErrors({})
    setBookingId(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">
              {step === 'calendar' && 'Seleziona Data e Orario'}
              {step === 'details' && 'I Tuoi Dati'}
              {step === 'success' && 'Prenotazione Ricevuta!'}
            </h2>
            <p className="text-teal-100">
              {professional.name} - {service?.name || professional.category}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Calendar */}
          {step === 'calendar' && (
            <BookingCalendar
              professionalId={professional.id}
              serviceId={service?.id}
              serviceName={service?.name}
              serviceDuration={service?.duration_minutes}
              onSelectSlot={handleSlotSelect}
            />
          )}

          {/* Step 2: Details */}
          {step === 'details' && (
            <div className="max-w-2xl mx-auto">
              {/* Riepilogo selezione */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-teal-900 mb-3">Riepilogo Prenotazione</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">Data:</span>
                    <span>{selectedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">Orario:</span>
                    <span>{selectedTime}</span>
                  </div>
                  {service && (
                    <>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">Servizio:</span>
                        <span>{service.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">Durata:</span>
                        <span>{service.duration_minutes} minuti</span>
                      </div>
                      {service.price && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">Prezzo:</span>
                          <span className="text-teal-700 font-semibold">€{service.price}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nome e Cognome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Mario Rossi"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="mario.rossi@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+39 333 1234567"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Note (opzionale)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Eventuali note o richieste particolari..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Indietro
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Prenotazione in corso...
                      </>
                    ) : (
                      'Conferma Prenotazione'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="max-w-md mx-auto text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Richiesta Inviata!
              </h3>

              <p className="text-gray-600 mb-6">
                La tua richiesta di prenotazione è stata inviata a <strong>{professional.name}</strong>.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-yellow-900 mb-2">
                  <strong>⏰ Attendi conferma</strong>
                </p>
                <p className="text-sm text-yellow-800">
                  Il professionista ha 2 ore per confermare la tua prenotazione.
                  Riceverai una email di conferma a <strong>{formData.email}</strong>.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
                <p className="font-medium text-gray-900 mb-2">Dettagli prenotazione:</p>
                <div className="space-y-1 text-gray-600">
                  <div>📅 Data: <strong>{selectedDate}</strong></div>
                  <div>🕐 Orario: <strong>{selectedTime}</strong></div>
                  {service && (
                    <>
                      <div>🔧 Servizio: <strong>{service.name}</strong></div>
                      {service.price && (
                        <div>💰 Prezzo: <strong>€{service.price}</strong></div>
                      )}
                    </>
                  )}
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    ID Prenotazione: <strong>#{bookingId}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
