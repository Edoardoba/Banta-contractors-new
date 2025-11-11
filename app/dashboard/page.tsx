'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Star,
} from 'lucide-react'
import ReliabilityBadge from '@/components/ReliabilityBadge'

interface Booking {
  id: number
  customer_id: number
  booking_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  created_at: string
  customer_name?: string
  customer_email?: string
}

interface Stats {
  reliability_score: number
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  no_show_count: number
  completion_rate: number
  cancellation_rate: number
  status: 'new' | 'verified' | 'premium' | 'suspended'
}

export default function Dashboard() {
  // Per demo, usa professional_id=1. In produzione, ottieni da auth
  const DEMO_PROFESSIONAL_ID = 1

  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'all'>('pending')

  useEffect(() => {
    fetchBookings()
    fetchStats()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?professional_id=${DEMO_PROFESSIONAL_ID}`)
      const data = await response.json()
      setBookings(data)
    } catch (error) {
      console.error('Errore nel recupero prenotazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/professionals/${DEMO_PROFESSIONAL_ID}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Errore nel recupero statistiche:', error)
    }
  }

  const handleConfirm = async (bookingId: number) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Prenotazione confermata!')
        fetchBookings()
        fetchStats()
      }
    } catch (error) {
      console.error('Errore nella conferma:', error)
      alert('Errore nella conferma')
    }
  }

  const handleCancel = async (bookingId: number) => {
    const reason = prompt('Motivo della cancellazione:')
    if (!reason) return

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelled_by: 'professional',
          reason,
        }),
      })

      if (response.ok) {
        alert('Prenotazione cancellata')
        fetchBookings()
        fetchStats()
      }
    } catch (error) {
      console.error('Errore nella cancellazione:', error)
      alert('Errore nella cancellazione')
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true
    return b.status === activeTab
  })

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: 'Confermato', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { label: 'Completato', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      cancelled: { label: 'Cancellato', color: 'bg-red-100 text-red-800', icon: XCircle },
      no_show: { label: 'No-Show', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }

    const config = configs[status] || configs.pending
    const Icon = config.icon

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard Professionista
            </h1>
            {stats && (
              <ReliabilityBadge
                status={stats.status}
                reliability_score={stats.reliability_score}
                completion_rate={stats.completion_rate}
                total_bookings={stats.total_bookings}
                size="md"
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Affidabilità</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.reliability_score}</p>
                  <p className="text-xs text-gray-500 mt-1">/ 100</p>
                </div>
                <TrendingUp className="w-8 h-8 text-teal-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Prenotazioni</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_bookings}</p>
                  <p className="text-xs text-gray-500 mt-1">Totali</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completamento</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completion_rate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.completed_bookings} completate</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cancellazioni</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.cancellation_rate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.cancelled_bookings} cancellate</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { key: 'pending', label: 'In Attesa' },
                { key: 'confirmed', label: 'Confermate' },
                { key: 'all', label: 'Tutte' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-teal-600 border-b-2 border-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label} ({bookings.filter((b) => tab.key === 'all' || b.status === tab.key).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              Nessuna prenotazione {activeTab !== 'all' && activeTab}
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-sm text-gray-500">
                        Prenotazione #{booking.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600">Data</p>
                        <p className="font-semibold text-gray-900">{booking.booking_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Orario</p>
                        <p className="font-semibold text-gray-900">
                          {booking.start_time} - {booking.end_time}
                        </p>
                      </div>
                      {booking.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Note</p>
                          <p className="text-gray-900">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {booking.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      >
                        Conferma
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Rifiuta
                      </button>
                    </div>
                  )}

                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium ml-4"
                    >
                      Cancella
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
