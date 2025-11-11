'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, Heart, Star, Filter, X, PanelLeftClose, PanelLeft, User, LogOut } from 'lucide-react'
import type { Professional } from '@/lib/professionals'
import type { Service } from '@/lib/services'
import ServicesPopup from '@/components/ServicesPopup'
import ReliabilityBadge from '@/components/ReliabilityBadge'
import BookingModal from '@/components/BookingModal'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/contexts/AuthContext'

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

export default function Home() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [showServicesPopup, setShowServicesPopup] = useState(false)
  const [servicesForPopup, setServicesForPopup] = useState<Service[]>([])
  const [professionalForServices, setProfessionalForServices] = useState<Professional | null>(null)
  const [loadingServices, setLoadingServices] = useState(false)
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | undefined>(undefined)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    fetchProfessionals()
  }, [])

  useEffect(() => {
    filterProfessionals()
  }, [searchTerm, selectedCategory, professionals, mapBounds])

  const fetchProfessionals = async () => {
    try {
      const response = await fetch('/api/professionals')
      const data = await response.json()
      setProfessionals(data)
      setFilteredProfessionals(data)
    } catch (error) {
      console.error('Errore nel recupero dei professionisti:', error)
    }
  }

  const filterProfessionals = () => {
    let filtered = [...professionals]

    // Filter by map bounds first (if set)
    if (mapBounds) {
      filtered = filtered.filter((p) => {
        return (
          p.latitude >= mapBounds.south &&
          p.latitude <= mapBounds.north &&
          p.longitude >= mapBounds.west &&
          p.longitude <= mapBounds.east
        )
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    setFilteredProfessionals(filtered)
  }

  const handleSearchInArea = (bounds: { north: number; south: number; east: number; west: number }) => {
    setMapBounds(bounds)
  }

  const categories = Array.from(new Set(professionals.map((p) => p.category)))

  const handleShowServices = async (e: React.MouseEvent, professional: Professional) => {
    e.stopPropagation() // Prevent card click
    setLoadingServices(true)
    setProfessionalForServices(professional)
    setShowServicesPopup(true)

    try {
      const response = await fetch(`/api/services?professional_id=${professional.id}`)
      const data = await response.json()
      setServicesForPopup(data)
    } catch (error) {
      console.error('Errore nel recupero dei servizi:', error)
      setServicesForPopup([])
    } finally {
      setLoadingServices(false)
    }
  }

  const handleCloseServicesPopup = () => {
    setShowServicesPopup(false)
    setServicesForPopup([])
    setProfessionalForServices(null)
  }

  const handleBookService = (service: Service) => {
    setSelectedService(service)
    setShowServicesPopup(false)
    setShowBookingModal(true)
  }

  const handleCloseBookingModal = () => {
    setShowBookingModal(false)
    setSelectedService(undefined)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50">
      {/* Left Sidebar - Filters */}
      <div className={`${showFilters ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white/90 backdrop-blur-sm border-r border-gray-200 shadow-lg`}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
              Filtri
            </h2>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Categoria</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Tutte le Categorie
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fascia di Prezzo</h3>
            <div className="space-y-2">
              {['€0-30/ora', '€30-60/ora', '€60-100/ora', '€100+/ora'].map((range) => (
                <button
                  key={range}
                  className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Valutazione Minima</h3>
            <div className="space-y-2">
              {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                <button
                  key={rating}
                  className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2"
                >
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {rating}+ Stelle
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center Column - Listings */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  showFilters 
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label={showFilters ? 'Nascondi sidebar' : 'Mostra sidebar'}
              >
                {showFilters ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {showFilters ? 'Nascondi' : 'Filtri'}
                </span>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Banta
              </h1>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Roma, Italia</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cerca professionisti..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    // Reset map bounds when searching
                    if (e.target.value && mapBounds) {
                      setMapBounds(null)
                    }
                  }}
                  onFocus={() => {
                    // Reset map bounds when focusing on search
                    if (mapBounds) {
                      setMapBounds(null)
                    }
                  }}
                  className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setMapBounds(null)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Auth button */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg">
                    <User className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-700">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Accedi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 text-sm text-gray-600">
            {filteredProfessionals.length} {filteredProfessionals.length === 1 ? 'professionista trovato' : 'professionisti trovati'}
          </div>
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => (
              <div
                key={professional.id}
                onClick={() => setSelectedProfessional(professional)}
                className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden border-2 ${
                  selectedProfessional?.id === professional.id
                    ? 'border-teal-500'
                    : 'border-transparent hover:border-teal-200'
                }`}
              >
                <div className="flex">
                  <div className="w-64 h-48 bg-gradient-to-br from-teal-400 to-purple-500 flex-shrink-0 relative overflow-hidden">
                    {professional.image_url ? (
                      <>
                        <img
                          src={professional.image_url}
                          alt={professional.name}
                          className="w-full h-full object-contain object-center bg-gray-100"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback se l'immagine non carica
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div className="hidden w-full h-full absolute inset-0 items-center justify-center text-white text-2xl font-bold">
                          {professional.name.charAt(0)}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {professional.name.charAt(0)}
                      </div>
                    )}
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm z-10"
                    >
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {professional.name}
                          </h3>
                          {professional.status && (
                            <ReliabilityBadge
                              status={professional.status}
                              reliability_score={professional.reliability_score}
                              completion_rate={professional.completion_rate}
                              total_bookings={professional.total_bookings}
                              size="sm"
                            />
                          )}
                        </div>
                        <p className="text-sm text-teal-600 font-medium mb-2">
                          {professional.category}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {professional.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{professional.location_name}</span>
                          </div>
                          {professional.price_range && (
                            <span className="font-semibold text-gray-700">
                              {professional.price_range}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleShowServices(e, professional)}
                          className="mt-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                        >
                          Mostra Servizi
                        </button>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-900">
                            {(Number(professional.rating) || 0).toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({professional.review_count})
                          </span>
                        </div>
                        {professional.total_bookings !== undefined && professional.total_bookings > 0 && (
                          <div className="text-xs text-gray-500 text-right">
                            <div>{professional.completion_rate?.toFixed(0)}% completato</div>
                            <div>{professional.total_bookings} prenotazioni</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredProfessionals.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nessun professionista trovato. Prova ad aggiustare i filtri.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Map */}
      <div className="w-1/2 lg:w-96 xl:w-[500px] border-l border-gray-200 bg-white relative">
        <MapComponent
          professionals={filteredProfessionals}
          selectedProfessional={selectedProfessional}
          onSelectProfessional={setSelectedProfessional}
          onSearchInArea={handleSearchInArea}
        />
      </div>

      {/* Services Popup */}
      {professionalForServices && (
        <ServicesPopup
          professionalName={professionalForServices.name}
          services={servicesForPopup}
          isOpen={showServicesPopup}
          onClose={handleCloseServicesPopup}
          isLoading={loadingServices}
          onBookService={handleBookService}
        />
      )}

      {/* Booking Modal */}
      {professionalForServices && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={handleCloseBookingModal}
          professional={professionalForServices}
          service={selectedService}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Ricarica dati se necessario
        }}
      />
    </div>
  )
}

