'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  Calendar,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface Service {
  name: string
  description: string
  price: number
  duration_minutes: number
}

interface Availability {
  day_of_week: number
  start_time: string
  end_time: string
}

interface OnboardingData {
  // Step 1: Dati Personali
  name: string
  email: string
  password: string
  phone: string

  // Step 2: Dati Professionali
  category: string
  description: string
  address: string
  image_url: string

  // Step 3: Servizi
  services: Service[]

  // Step 4: Disponibilità
  availability: Availability[]
}

const CATEGORIES = [
  'Idraulico',
  'Elettricista',
  'Babysitter',
  'Pulizie',
  'Imbianchino',
  'Fabbro',
  'Giardiniere',
  'Tecnico Climatizzazione',
  'Falegname',
  'Muratore',
  'Altro',
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
]

export default function ProfessionalOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    category: '',
    description: '',
    address: '',
    image_url: '',
    services: [{ name: '', description: '', price: 0, duration_minutes: 60 }],
    availability: [
      { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
      { day_of_week: 2, start_time: '09:00', end_time: '18:00' },
      { day_of_week: 3, start_time: '09:00', end_time: '18:00' },
      { day_of_week: 4, start_time: '09:00', end_time: '18:00' },
      { day_of_week: 5, start_time: '09:00', end_time: '18:00' },
    ],
  })

  const totalSteps = 4

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const addService = () => {
    setData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        { name: '', description: '', price: 0, duration_minutes: 60 },
      ],
    }))
  }

  const updateService = (index: number, field: keyof Service, value: any) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }

  const removeService = (index: number) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }))
  }

  const toggleAvailability = (dayOfWeek: number) => {
    setData((prev) => {
      const exists = prev.availability.find((a) => a.day_of_week === dayOfWeek)
      if (exists) {
        // Rimuovi
        return {
          ...prev,
          availability: prev.availability.filter((a) => a.day_of_week !== dayOfWeek),
        }
      } else {
        // Aggiungi
        return {
          ...prev,
          availability: [
            ...prev.availability,
            { day_of_week: dayOfWeek, start_time: '09:00', end_time: '18:00' },
          ],
        }
      }
    })
  }

  const updateAvailability = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      availability: prev.availability.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a
      ),
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!data.name || !data.email || !data.password || !data.phone) {
          setError('Compila tutti i campi obbligatori')
          return false
        }
        if (data.password.length < 6) {
          setError('La password deve essere almeno 6 caratteri')
          return false
        }
        break
      case 2:
        if (!data.category || !data.description || !data.address) {
          setError('Compila tutti i campi obbligatori')
          return false
        }
        break
      case 3:
        if (data.services.length === 0) {
          setError('Aggiungi almeno un servizio')
          return false
        }
        for (const service of data.services) {
          if (!service.name || service.price <= 0) {
            setError('Ogni servizio deve avere nome e prezzo')
            return false
          }
        }
        break
      case 4:
        if (data.availability.length === 0) {
          setError('Seleziona almeno un giorno di disponibilità')
          return false
        }
        break
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (!validateStep(currentStep)) return
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/professionals/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Errore durante la registrazione')
        return
      }

      setSuccess(true)

      setTimeout(() => {
        // Redirect a login o dashboard
        window.location.href = '/dashboard'
      }, 2000)
    } catch (error) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md animate-scaleIn">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Benvenuto!</h2>
          <p className="text-gray-600">
            Il tuo account professionale è stato creato con successo.
            Verrai reindirizzato alla dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Diventa Professionista
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Completa la registrazione in {totalSteps} semplici passi
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 mx-1 rounded-full transition-all ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Passo {currentStep} di {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Dati Personali */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-slideIn">
              <div className="text-center mb-6">
                <User className="w-12 h-12 mx-auto text-teal-600 mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Dati Personali</h2>
                <p className="text-gray-600">I tuoi dati di contatto</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateData('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Mario Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="mario@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={data.password}
                  onChange={(e) => updateData('password', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="••••••••"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimo 6 caratteri</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="+39 333 1234567"
                />
              </div>
            </div>
          )}

          {/* Step 2: Dati Professionali */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-slideIn">
              <div className="text-center mb-6">
                <Briefcase className="w-12 h-12 mx-auto text-teal-600 mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Dati Professionali</h2>
                <p className="text-gray-600">Raccontaci della tua attività</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  value={data.category}
                  onChange={(e) => updateData('category', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Seleziona categoria</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione *
                </label>
                <textarea
                  value={data.description}
                  onChange={(e) => updateData('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Descrivi la tua esperienza e i tuoi servizi..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Questa descrizione sarà visibile ai clienti
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indirizzo completo (Roma) *
                </label>
                <input
                  type="text"
                  value={data.address}
                  onChange={(e) => updateData('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Via Roma 123, 00100 Roma RM"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Useremo questo indirizzo per mostrarti sulla mappa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Foto Profilo (opzionale)
                </label>
                <input
                  type="url"
                  value={data.image_url}
                  onChange={(e) => updateData('image_url', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>
          )}

          {/* Step 3: Servizi */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-slideIn">
              <div className="text-center mb-6">
                <DollarSign className="w-12 h-12 mx-auto text-teal-600 mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">I Tuoi Servizi</h2>
                <p className="text-gray-600">Cosa offri ai clienti?</p>
              </div>

              {data.services.map((service, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-gray-200 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Servizio #{index + 1}
                    </h3>
                    {data.services.length > 1 && (
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome servizio *
                      </label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) =>
                          updateService(index, 'name', e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Es: Riparazione perdite"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prezzo (€) *
                      </label>
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) =>
                          updateService(index, 'price', parseFloat(e.target.value))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="50"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durata (minuti)
                      </label>
                      <input
                        type="number"
                        value={service.duration_minutes}
                        onChange={(e) =>
                          updateService(
                            index,
                            'duration_minutes',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="60"
                        min="15"
                        step="15"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrizione
                      </label>
                      <textarea
                        value={service.description}
                        onChange={(e) =>
                          updateService(index, 'description', e.target.value)
                        }
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Descrizione dettagliata del servizio..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addService}
                className="w-full py-3 border-2 border-dashed border-teal-300 text-teal-600 rounded-xl hover:bg-teal-50 transition-colors font-medium"
              >
                + Aggiungi Servizio
              </button>
            </div>
          )}

          {/* Step 4: Disponibilità */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-slideIn">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 mx-auto text-teal-600 mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Disponibilità</h2>
                <p className="text-gray-600">Quando sei disponibile?</p>
              </div>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const avail = data.availability.find(
                    (a) => a.day_of_week === day.value
                  )
                  const isActive = !!avail

                  return (
                    <div
                      key={day.value}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        isActive
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleAvailability(day.value)}
                          className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="font-medium text-gray-900 w-24">
                          {day.label}
                        </span>

                        {isActive && (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={avail.start_time}
                              onChange={(e) =>
                                updateAvailability(
                                  day.value,
                                  'start_time',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="time"
                              value={avail.end_time}
                              onChange={(e) =>
                                updateAvailability(
                                  day.value,
                                  'end_time',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                disabled={loading}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Indietro
              </button>
            )}

            <button
              onClick={nextStep}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creazione account...
                </>
              ) : currentStep === totalSteps ? (
                <>
                  Completa Registrazione
                  <CheckCircle className="w-5 h-5" />
                </>
              ) : (
                <>
                  Avanti
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
