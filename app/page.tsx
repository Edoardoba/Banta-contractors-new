'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, Heart, Star, X, User, LogOut } from 'lucide-react'
import type { Professional } from '@/lib/professionals'
import type { Service } from '@/lib/services'
import ServicesPopup from '@/components/ServicesPopup'
import ReliabilityBadge from '@/components/ReliabilityBadge'
import BookingModal from '@/components/BookingModal'
import AuthModal from '@/components/AuthModal'
import ProfessionalCardSkeleton from '@/components/ProfessionalCardSkeleton'
import RoleSwitcher from '@/components/RoleSwitcher'
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
  const [showServicesPopup, setShowServicesPopup] = useState(false)
  const [servicesForPopup, setServicesForPopup] = useState<Service[]>([])
  const [professionalForServices, setProfessionalForServices] = useState<Professional | null>(null)
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingProfessionals, setLoadingProfessionals] = useState(true)
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
      setLoadingProfessionals(true)
      const response = await fetch('/api/professionals')
      const data = await response.json()
      setProfessionals(data)
      setFilteredProfessionals(data)
    } catch (error) {
      console.error('Errore nel recupero dei professionisti:', error)
    } finally {
      setLoadingProfessionals(false)
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

  // Calculate stats
  const totalProfessionals = professionals.length
  const avgRating = professionals.length > 0
    ? professionals.reduce((sum, p) => sum + (Number(p.rating) || 0), 0) / professionals.length
    : 0
  const totalReviews = professionals.reduce((sum, p) => sum + (p.review_count || 0), 0)

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="glass-effect border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Banta
              </h1>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Roma, Italia</span>
              </div>
              <a
                href="/professional-signup"
                className="hidden lg:flex btn-ripple items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all text-sm font-medium"
              >
                <Star className="w-4 h-4" />
                Diventa Professionista
              </a>
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

              {/* Role Switcher for dual role users */}
              <RoleSwitcher />

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
                  className="btn-ripple flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Accedi</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`btn-ripple flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Tutte
            </button>
            {categories.map((category, index) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`btn-ripple flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all opacity-0 animate-fadeInUp ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        {!loadingProfessionals && (
          <div className="px-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-effect rounded-xl p-4 opacity-0 animate-fadeInUp border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Professionisti</p>
                  <p className="text-3xl font-bold text-gray-900">{totalProfessionals}</p>
                </div>
                <div className="p-3 bg-teal-100 rounded-lg">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-4 opacity-0 animate-fadeInUp delay-100 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rating Medio</p>
                  <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    {avgRating.toFixed(1)}
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-4 opacity-0 animate-fadeInUp delay-200 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recensioni Totali</p>
                  <p className="text-3xl font-bold text-gray-900">{totalReviews}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listings */}
        <div className="flex-1 overflow-y-auto p-6">
          {!loadingProfessionals && (
            <div className="mb-4 text-sm text-gray-600 animate-fadeInUp">
              {filteredProfessionals.length} {filteredProfessionals.length === 1 ? 'professionista trovato' : 'professionisti trovati'}
            </div>
          )}
          <div className="space-y-4">
            {loadingProfessionals ? (
              // Skeleton loading
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="opacity-0 animate-fadeInUp" style={{ animationDelay: `${i * 100}ms` }}>
                    <ProfessionalCardSkeleton />
                  </div>
                ))}
              </>
            ) : (
              // Actual cards with stagger animation
              filteredProfessionals.map((professional, index) => (
                <div
                  key={professional.id}
                  onClick={() => setSelectedProfessional(professional)}
                  className={`opacity-0 animate-fadeInUp card-hover bg-white rounded-xl cursor-pointer overflow-hidden border-2 ${
                    selectedProfessional?.id === professional.id
                      ? 'border-teal-500 shadow-lg'
                      : 'border-transparent'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
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
                          className="btn-ripple mt-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
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
            ))
            )}
            {!loadingProfessionals && filteredProfessionals.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 animate-fadeInUp">
                <div className="glass-effect rounded-2xl p-12 max-w-md text-center border border-white/50">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                    <Search className="w-12 h-12 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Nessun risultato trovato
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm
                      ? `Nessun professionista trovato per "${searchTerm}"`
                      : selectedCategory
                      ? `Nessun professionista nella categoria "${selectedCategory}"`
                      : 'Prova a modificare i filtri di ricerca'}
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory(null)
                      setMapBounds(null)
                    }}
                    className="btn-ripple px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all font-medium"
                  >
                    Rimuovi filtri
                  </button>
                </div>
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

