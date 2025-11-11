'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Professional } from '@/lib/professionals'

// Fix for default marker icons in Next.js
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const tealIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="#14b8a6" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="#fff" cx="12.5" cy="12.5" r="5"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function MapUpdater({ 
  selectedProfessional 
}: { 
  selectedProfessional: Professional | null 
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedProfessional) {
      map.setView(
        [selectedProfessional.latitude, selectedProfessional.longitude],
        13,
        { animate: true }
      )
    }
  }, [selectedProfessional, map])

  return null
}

function SearchAreaButton({ 
  onSearchInArea 
}: { 
  onSearchInArea: (bounds: { north: number; south: number; east: number; west: number }) => void 
}) {
  const map = useMap()

  const handleSearchInArea = () => {
    const bounds = map.getBounds()
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()
    
    onSearchInArea({ north, south, east, west })
  }

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-[1000]">
      <button 
        onClick={handleSearchInArea}
        className="text-sm font-semibold text-gray-700 hover:text-teal-600 transition-colors"
      >
        Cerca in quest'area
      </button>
    </div>
  )
}

interface MapComponentProps {
  professionals: Professional[]
  selectedProfessional: Professional | null
  onSelectProfessional: (professional: Professional) => void
  onSearchInArea?: (bounds: { north: number; south: number; east: number; west: number }) => void
}

export default function MapComponent({
  professionals,
  selectedProfessional,
  onSelectProfessional,
  onSearchInArea,
}: MapComponentProps) {
  // Default to Rome, Italy if no professionals
  const centerLat = professionals.length > 0
    ? professionals.reduce((sum, p) => sum + p.latitude, 0) / professionals.length
    : 41.9028  // Rome coordinates
  const centerLng = professionals.length > 0
    ? professionals.reduce((sum, p) => sum + p.longitude, 0) / professionals.length
    : 12.4964  // Rome coordinates

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater selectedProfessional={selectedProfessional} />
        {onSearchInArea && <SearchAreaButton onSearchInArea={onSearchInArea} />}
        {professionals.map((professional) => (
          <Marker
            key={professional.id}
            position={[professional.latitude, professional.longitude]}
            icon={
              selectedProfessional?.id === professional.id ? tealIcon : defaultIcon
            }
            eventHandlers={{
              click: () => {
                onSelectProfessional(professional)
              },
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {professional.name}
                </h3>
                <p className="text-sm text-teal-600 font-medium mb-2">
                  {professional.category}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>📍</span>
                  <span>{professional.location_name}</span>
                </div>
                {professional.price_range && (
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    {professional.price_range}
                  </p>
                )}
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold">{(Number(professional.rating) || 0).toFixed(1)}</span>
                  <span className="text-gray-500">({professional.review_count} recensioni)</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

