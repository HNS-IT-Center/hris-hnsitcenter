"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix for default marker icon in leaflet under webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return <Marker position={position} icon={icon} />
}

interface MapPickerProps {
  position: [number, number]
  setPosition: (p: [number, number]) => void
  radiusMeters?: number
}

export default function MapPicker({ position, setPosition, radiusMeters }: MapPickerProps) {
  // Check if window is defined to avoid SSR issues, though dynamic import with ssr: false usually handles this.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-full w-full bg-muted animate-pulse rounded-md" />

  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-border z-0">
      <MapContainer center={position} zoom={15} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
        {radiusMeters && (
          <Circle
            center={position}
            radius={radiusMeters}
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.3 }}
          />
        )}
      </MapContainer>
    </div>
  )
}
