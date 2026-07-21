"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Search, MapPin, Store, Users, Check, X, LogIn, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
})

// Custom HTML icon for profile pics
const createProfileIcon = (avatarUrl?: string | null, name: string = "", opacity: number = 1) => {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
  const content = avatarUrl 
    ? `<img src="${avatarUrl}" class="w-full h-full object-cover" />` 
    : `<div class="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">${initials}</div>`
  
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<div style="opacity: ${opacity};" class="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-white hover:scale-110 transition-transform">${content}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 })
  }, [center, zoom, map])
  return null
}

export default function AttendanceMapClient({ initialData }: { initialData: any }) {
  const logs = initialData.logs || []
  
  const [mapMode, setMapMode] = useState<"checkIn" | "checkOut">("checkIn")
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("Semua")
  const [storeFilter, setStoreFilter] = useState("Semua")
  const [center, setCenter] = useState<[number, number]>([-6.200000, 106.816666])
  const [zoom, setZoom] = useState(12)
  const [activeLogId, setActiveLogId] = useState<string | null>(null)

  const departments = Array.from(new Set(logs.map((l: any) => l.employee.departmentName).filter(Boolean))) as string[]
  const stores = Array.from(new Set(logs.map((l: any) => l.employee.store?.name).filter(Boolean))) as string[]

  // Determine if a log has coordinates for the current mode
  const getCoords = (log: any): [number, number] | null => {
    const lat = mapMode === "checkIn" ? log.att?.checkInLat : log.att?.checkOutLat
    const lng = mapMode === "checkIn" ? log.att?.checkInLng : log.att?.checkOutLng
    if (lat && lng) return [lat, lng]
    return null
  }

  // Handle snap to employee
  const handleSnapToEmployee = (log: any) => {
    const coords = getCoords(log)
    if (coords) {
      setCenter(coords)
      setZoom(17)
      setActiveLogId(log.employee.id)
    }
  }

  // Handle snap to store
  const handleSnapToStore = (storeName: string) => {
    setStoreFilter(storeName)
    // Find the first employee in this store to center on
    const firstInStore = logs.find((l: any) => l.employee.store?.name === storeName && getCoords(l))
    if (firstInStore) {
      const coords = getCoords(firstInStore)
      if (coords) {
        setCenter(coords)
        setZoom(16)
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] w-full flex-col md:flex-row gap-4 overflow-hidden rounded-xl border bg-background p-2">
      
      {/* SIDEBAR (Game UI) */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex w-full flex-col gap-4 md:w-80 lg:w-96 shrink-0 h-full overflow-hidden"
      >
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setMapMode("checkIn")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", mapMode === "checkIn" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <LogIn className="h-4 w-4" /> Check In
          </button>
          <button
            onClick={() => setMapMode("checkOut")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", mapMode === "checkOut" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <LogOut className="h-4 w-4" /> Check Out
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari karyawan..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
            value={storeFilter}
            onChange={(e) => handleSnapToStore(e.target.value)}
          >
            <option value="Semua">Semua Store (Snap)</option>
            {stores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="Semua">Semua Departemen</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {logs.map((log: any) => {
            const coords = getCoords(log)
            if (!coords) return null

            // Search filter
            const matchesSearch = log.employee.name.toLowerCase().includes(search.toLowerCase())
            const matchesDept = deptFilter === "Semua" || log.employee.departmentName === deptFilter
            const matchesStore = storeFilter === "Semua" || log.employee.store?.name === storeFilter
            
            const isVisible = matchesSearch && matchesDept && matchesStore
            if (!isVisible) return null

            const isLate = mapMode === "checkIn" ? log.att?.lateMinutes > 0 : false

            return (
              <motion.div
                key={log.employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleSnapToEmployee(log)}
                className={cn(
                  "cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/50",
                  activeLogId === log.employee.id ? "border-primary ring-1 ring-primary" : ""
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {log.employee.avatarUrl ? (
                      <img src={log.employee.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                        {log.employee.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm">{log.employee.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.employee.store?.name || "Tidak ada store"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">
                      {mapMode === "checkIn" ? (
                        log.att?.checkIn ? new Date(log.att.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"
                      ) : (
                        log.att?.checkOut ? new Date(log.att.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"
                      )}
                    </p>
                    <p className={cn("text-[10px] font-semibold mt-0.5", isLate ? "text-destructive" : "text-emerald-500")}>
                      {isLate ? "Telat" : "Tepat Waktu"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* MAP CANVAS */}
      <div className="relative flex-1 overflow-hidden rounded-lg border bg-muted">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <MapController center={center} zoom={zoom} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
          >
            {logs.map((log: any) => {
              const coords = getCoords(log)
              if (!coords) return null

              const matchesSearch = log.employee.name.toLowerCase().includes(search.toLowerCase())
              const matchesDept = deptFilter === "Semua" || log.employee.departmentName === deptFilter
              const matchesStore = storeFilter === "Semua" || log.employee.store?.name === storeFilter
              
              const isFiltered = matchesSearch && matchesDept && matchesStore
              // If not filtered, we reduce opacity heavily instead of hiding
              const opacity = isFiltered ? 1 : 0.2

              const isLate = mapMode === "checkIn" ? log.att?.lateMinutes > 0 : false

              return (
                <Marker 
                  key={log.employee.id} 
                  position={coords}
                  icon={createProfileIcon(log.employee.avatarUrl, log.employee.name, opacity)}
                  eventHandlers={{
                    click: () => {
                      setActiveLogId(log.employee.id)
                      setCenter(coords)
                    }
                  }}
                >
                  {isFiltered && (
                    <Popup className="custom-popup">
                      <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                        <div className="flex items-center gap-3 border-b pb-2">
                           <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                            {log.employee.avatarUrl ? (
                              <img src={log.employee.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                                {log.employee.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-tight m-0">{log.employee.name}</p>
                            <p className="text-[11px] text-muted-foreground m-0">{log.employee.departmentName}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="rounded bg-muted/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Waktu</p>
                            <p className="font-mono font-semibold text-sm">
                              {mapMode === "checkIn" ? (
                                log.att?.checkIn ? new Date(log.att.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"
                              ) : (
                                log.att?.checkOut ? new Date(log.att.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"
                              )}
                            </p>
                          </div>
                          <div className={cn("rounded p-2 text-center flex flex-col items-center justify-center", isLate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600")}>
                            {isLate ? <X className="h-4 w-4 mb-0.5" /> : <Check className="h-4 w-4 mb-0.5" />}
                            <p className="text-[10px] font-bold uppercase">{isLate ? "Telat" : "Tepat Waktu"}</p>
                          </div>
                        </div>

                        {((mapMode === "checkIn" ? log.att?.checkInSelfieUrl : log.att?.checkOutSelfieUrl)) && (
                          <div className="mt-2 rounded-md overflow-hidden h-32 w-full bg-black">
                            <img 
                              src={mapMode === "checkIn" ? log.att?.checkInSelfieUrl : log.att?.checkOutSelfieUrl} 
                              alt="Selfie" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </Popup>
                  )}
                </Marker>
              )
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-leaflet-marker {
          background: transparent;
          border: none;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .custom-popup .leaflet-popup-content {
          margin: 12px;
        }
      `}} />
    </div>
  )
}
