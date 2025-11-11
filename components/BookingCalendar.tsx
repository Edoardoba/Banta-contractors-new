'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface TimeSlot {
  time: string
  available: boolean
}

interface BookingCalendarProps {
  professionalId: number
  serviceId?: number
  serviceName?: string
  serviceDuration?: number // minuti
  onSelectSlot: (date: string, time: string) => void
}

export default function BookingCalendar({
  professionalId,
  serviceId,
  serviceName,
  serviceDuration = 60,
  onSelectSlot,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  // Genera giorni del mese
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Aggiungi giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const days = getDaysInMonth(currentMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDate(null)
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const isDateSelectable = (date: Date | null): boolean => {
    if (!date) return false
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    return dateOnly >= today
  }

  const handleDateClick = async (date: Date) => {
    if (!isDateSelectable(date)) return

    const dateStr = formatDate(date)
    setSelectedDate(dateStr)
    setLoading(true)

    try {
      // Fetch slot disponibili per questa data
      const response = await fetch(
        `/api/availability/slots?professional_id=${professionalId}&date=${dateStr}&duration=${serviceDuration}`
      )

      if (response.ok) {
        const slots = await response.json()
        setAvailableSlots(slots)
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Errore nel recupero slot:', error)
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleTimeClick = (time: string) => {
    if (selectedDate) {
      onSelectSlot(selectedDate, time)
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendario */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header mese */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mese successivo"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Griglia calendario */}
        <div className="p-4">
          {/* Nomi giorni */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-semibold text-gray-600 py-2"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Giorni */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dateStr = formatDate(day)
              const isSelected = selectedDate === dateStr
              const isSelectable = isDateSelectable(day)
              const isToday = formatDate(day) === formatDate(new Date())

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  disabled={!isSelectable}
                  className={`
                    aspect-square
                    rounded-lg
                    text-sm
                    font-medium
                    transition-all
                    ${isSelectable
                      ? 'hover:bg-teal-50 hover:text-teal-700 cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                    }
                    ${isSelected
                      ? 'bg-teal-500 text-white hover:bg-teal-600'
                      : 'text-gray-700'
                    }
                    ${isToday && !isSelected
                      ? 'ring-2 ring-teal-500 ring-offset-2'
                      : ''
                    }
                  `}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slot orari */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">
              Seleziona orario
              {serviceName && ` per ${serviceName}`}
            </h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nessun orario disponibile per questa data.
              <br />
              Prova un altro giorno.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => handleTimeClick(slot.time)}
                  disabled={!slot.available}
                  className={`
                    py-2.5
                    px-4
                    rounded-lg
                    text-sm
                    font-medium
                    transition-all
                    ${slot.available
                      ? 'bg-white border-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-400'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white border-2 border-teal-200 rounded"></div>
              Disponibile
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              Non disponibile
            </span>
          </div>
        </div>
      )}

      {!selectedDate && (
        <div className="text-center text-gray-500 py-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Seleziona una data per vedere gli orari disponibili</p>
        </div>
      )}
    </div>
  )
}
