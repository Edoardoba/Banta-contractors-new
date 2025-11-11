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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validazione client-side
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo file non supportato. Usa JPG, PNG o WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande. Massimo 5MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      // Preview locale
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload al server
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/upload/professional-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore durante upload')
      }

      const result = await response.json()
      updateData('image_url', result.url)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Errore durante upload immagine')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
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
      const slotsForDay = prev.availability.filter((a) => a.day_of_week === dayOfWeek)
      if (slotsForDay.length > 0) {
        // Rimuovi tutti gli slot per questo giorno
        return {
          ...prev,
          availability: prev.availability.filter((a) => a.day_of_week !== dayOfWeek),
        }
      } else {
        // Aggiungi uno slot default per questo giorno
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

  const addTimeSlot = (dayOfWeek: number) => {
    setData((prev) => ({
      ...prev,
      availability: [
        ...prev.availability,
        { day_of_week: dayOfWeek, start_time: '09:00', end_time: '18:00' },
      ],
    }))
  }

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    setData((prev) => {
      const slotsForDay = prev.availability.filter((a) => a.day_of_week === dayOfWeek)
      // Se è l'ultimo slot, disabilita il giorno completamente
      if (slotsForDay.length === 1) {
        return {
          ...prev,
          availability: prev.availability.filter((a) => a.day_of_week !== dayOfWeek),
        }
      }
      // Altrimenti rimuovi solo lo slot specifico
      const allSlots = prev.availability.filter((a) => a.day_of_week === dayOfWeek)
      const slotToRemove = allSlots[slotIndex]
      let removed = false
      return {
        ...prev,
        availability: prev.availability.filter((a) => {
          if (a.day_of_week === dayOfWeek && !removed &&
              a.start_time === slotToRemove.start_time &&
              a.end_time === slotToRemove.end_time) {
            removed = true
            return false
          }
          return true
        }),
      }
    })
  }

  const updateTimeSlot = (
    dayOfWeek: number,
    slotIndex: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setData((prev) => {
      const slotsForDay = prev.availability.filter((a) => a.day_of_week === dayOfWeek)
      const slotToUpdate = slotsForDay[slotIndex]

      let updated = false
      return {
        ...prev,
        availability: prev.availability.map((a) => {
          if (a.day_of_week === dayOfWeek && !updated &&
              a.start_time === slotToUpdate.start_time &&
              a.end_time === slotToUpdate.end_time) {
            updated = true
            return { ...a, [field]: value }
          }
          return a
        }),
      }
    })
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
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl animate-float shadow-lg">
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
        <div className="gradient-border shadow-2xl p-8 animate-scaleIn">
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
                  Foto Profilo (opzionale)
                </label>

                {/* Preview immagine */}
                {imagePreview && (
                  <div className="mb-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-xl border-2 border-teal-500"
                    />
                  </div>
                )}

                {/* Input file */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                  />
                  {uploadingImage && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG o WebP - Massimo 5MB
                </p>
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
                  const slotsForDay = data.availability.filter(
                    (a) => a.day_of_week === day.value
                  )
                  const isActive = slotsForDay.length > 0

                  return (
                    <div
                      key={day.value}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        isActive
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Header giorno */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleAvailability(day.value)}
                            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <span className="font-medium text-gray-900">
                            {day.label}
                          </span>
                        </div>
                        {isActive && slotsForDay.length > 0 && (
                          <span className="text-xs text-teal-600 font-medium">
                            {slotsForDay.length} {slotsForDay.length === 1 ? 'intervallo' : 'intervalli'}
                          </span>
                        )}
                      </div>

                      {/* Slot orari */}
                      {isActive && (
                        <div className="ml-8 space-y-3">
                          {slotsForDay.map((slot, slotIndex) => (
                            <div
                              key={slotIndex}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) =>
                                  updateTimeSlot(
                                    day.value,
                                    slotIndex,
                                    'start_time',
                                    e.target.value
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) =>
                                  updateTimeSlot(
                                    day.value,
                                    slotIndex,
                                    'end_time',
                                    e.target.value
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                              {slotsForDay.length > 1 && (
                                <button
                                  onClick={() => removeTimeSlot(day.value, slotIndex)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium px-3"
                                >
                                  Rimuovi
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Bottone aggiungi slot */}
                          <button
                            onClick={() => addTimeSlot(day.value)}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
                          >
                            <span className="text-lg">+</span> Aggiungi intervallo
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Suggerimento:</strong> Puoi aggiungere più intervalli per lo stesso giorno.
                  Ad esempio: Lunedì 9:00-12:00 e 16:00-18:00
                </p>
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
                className="btn-ripple flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Indietro
              </button>
            )}

            <button
              onClick={nextStep}
              disabled={loading}
              className="btn-ripple flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
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
        .animate-slideIn {
          animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}
