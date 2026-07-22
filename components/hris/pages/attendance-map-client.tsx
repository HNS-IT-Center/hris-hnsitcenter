"use client"

import React, { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Search, MapPin, Store, Users, Check, X, LogIn, LogOut, ChevronLeft, ChevronRight, List, LayoutGrid, Filter } from "lucide-react"
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

const createClusterCustomIcon = function (cluster: any) {
  const count = cluster.getChildCount()
  const children = cluster.getAllChildMarkers()
  const allFilteredOut = children.every((marker: any) => marker.options.opacity === 0.2)
  const opacityClass = allFilteredOut ? 'opacity-40 grayscale' : 'opacity-100'

  return L.divIcon({
    html: `<div class="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-primary flex flex-col items-center justify-center text-primary-foreground font-bold text-sm hover:scale-110 transition-transform ${opacityClass}">
      <span>${count}</span>
      <span class="text-[8px] font-normal leading-none -mt-0.5">Staf</span>
    </div>`,
    className: 'custom-leaflet-cluster',
    iconSize: L.point(40, 40, true),
  })
}

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    const currentCenter = map.getCenter()
    const currentZoom = map.getZoom()
    if (Math.abs(currentCenter.lat - center[0]) > 0.0001 || Math.abs(currentCenter.lng - center[1]) > 0.0001 || currentZoom !== zoom) {
      map.flyTo(center, zoom, { duration: 1.0 })
    }
  }, [center, zoom, map])
  return null
}

export default function AttendanceMapClient({ initialData, hrdStoreCoords }: { initialData: any, hrdStoreCoords?: { lat: number, lng: number, name: string } }) {
  const logs = initialData.logs || []
  
  const [mapMode, setMapMode] = useState<"checkIn" | "checkOut">("checkIn")
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("Semua")
  const [storeFilter, setStoreFilter] = useState("Semua")
  const [showSidebar, setShowSidebar] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }, [])
  
  const defaultCenter: [number, number] = hrdStoreCoords ? [hrdStoreCoords.lat, hrdStoreCoords.lng] : [-6.200000, 106.816666]
  const [center, setCenter] = useState<[number, number]>(defaultCenter)
  const [zoom, setZoom] = useState(hrdStoreCoords ? 16 : 12)
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  
  const markerRefs = useRef<Record<string, L.Marker>>({})

  const departments = Array.from(new Set(logs.map((l: any) => l.employee.departmentName).filter(Boolean))) as string[]
  const storeObjects = Array.from(new Map(logs.filter((l: any) => l.employee.store).map((l: any) => [l.employee.store.id, l.employee.store])).values()) as any[]
  const stores = storeObjects.map(s => s.name)
  if (hrdStoreCoords && !stores.includes(hrdStoreCoords.name)) {
    stores.push(hrdStoreCoords.name)
    storeObjects.push({ id: "hrd-store", name: hrdStoreCoords.name, latitude: hrdStoreCoords.lat, longitude: hrdStoreCoords.lng })
  }

  // Determine if a log has coordinates for the current mode
  const getCoords = (log: any): [number, number] | null => {
    const lat = mapMode === "checkIn" ? log.attendance?.checkInLat : log.attendance?.checkOutLat
    const lng = mapMode === "checkIn" ? log.attendance?.checkInLng : log.attendance?.checkOutLng
    if (lat && lng) return [lat, lng]
    return null
  }

  // Determine anomaly status
  const getIsAnomaly = (log: any, mode: "checkIn" | "checkOut") => {
    if (mode === "checkIn") {
      return log.attendance?.lateMinutes > 0
    } else {
      if (!log.attendance?.checkOutTime || !log.employee?.shift?.endTime) return false
      const checkOutTime = new Date(log.attendance.checkOutTime)
      const [endH, endM] = log.employee.shift.endTime.split(':').map(Number)
      
      const formatter = new Intl.DateTimeFormat("id-ID", { hour: "numeric", minute: "numeric", timeZone: "Asia/Jakarta" })
      const formatted = formatter.format(checkOutTime)
      const [coH, coM] = formatted.replace('.', ':').split(':').map(Number)
      
      return (coH * 60 + coM) < (endH * 60 + endM)
    }
  }

  // Handle snap to employee
  const handleSnapToEmployee = (log: any) => {
    const coords = getCoords(log)
    if (coords) {
      setCenter(coords)
      setZoom(22) // Max zoom to force clusters to open/spiderfy
      setActiveLogId(log.employee.id)
      
      // Wait for flyTo animation to finish before opening popup
      setTimeout(() => {
        const marker = markerRefs.current[log.employee.id]
        if (marker) {
          marker.openPopup()
        }
      }, 1100)
    }
  }

  // Handle snap to store
  const handleSnapToStore = (storeName: string) => {
    setStoreFilter(storeName)
    if (storeName === "Semua") return
    const targetStore = storeObjects.find(s => s.name === storeName)
    if (targetStore && targetStore.latitude && targetStore.longitude) {
      setCenter([targetStore.latitude, targetStore.longitude])
    } else {
      // Fallback to first employee
      const firstInStore = logs.find((l: any) => l.employee.store?.name === storeName && getCoords(l))
      if (firstInStore) {
        const coords = getCoords(firstInStore)
        if (coords) {
          setCenter(coords)
        }
      }
    }
  }

  return (
    <div className="relative flex h-[calc(100vh-12rem)] min-h-[800px] md:min-h-[600px] w-full flex-col overflow-hidden rounded-xl border bg-background md:p-0 p-2 gap-4 md:gap-0">
      
      {/* DESKTOP & MOBILE TOGGLE BUTTON & COLLAPSED SEARCH */}
      <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2 pointer-events-none dark text-white">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full border border-border bg-background/90 backdrop-blur-md shadow-md pointer-events-auto hover:bg-muted transition-colors text-foreground"
        >
          {showSidebar ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
        </button>
        
        <AnimatePresence>
          {!showSidebar && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative w-64 pointer-events-auto shadow-md rounded-full bg-background/90 backdrop-blur-md"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari karyawan..." 
                className="pl-9 h-10 rounded-full bg-transparent border-none focus-visible:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SIDEBAR (Absolute Overlay for both Mobile and Desktop) */}
      <div className={cn(
        "absolute left-4 top-16 bottom-4 z-[1000] flex flex-col shrink-0 overflow-hidden transition-all duration-300 pointer-events-auto dark text-white",
        "bg-background/95 md:bg-background/90 backdrop-blur-md rounded-xl shadow-lg border-border",
        showSidebar ? "w-[calc(100%-2rem)] max-w-sm md:w-80 lg:w-96 opacity-100 translate-x-0 border" : "w-0 opacity-0 -translate-x-10 border-none"
      )}>
        <div className="flex w-full md:w-80 lg:w-96 flex-col h-full gap-4 p-3 md:p-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setMapMode("checkIn")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all hover:bg-background/60 hover:text-foreground", mapMode === "checkIn" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <LogIn className="h-4 w-4" /> Check In
          </button>
          <button
            onClick={() => setMapMode("checkOut")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all hover:bg-background/60 hover:text-foreground", mapMode === "checkOut" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <LogOut className="h-4 w-4" /> Check Out
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari karyawan..." 
            className="pl-9 hover:bg-muted/60 transition-colors focus:bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none hover:bg-muted/60 transition-colors cursor-pointer text-white"
            value={storeFilter}
            onChange={(e) => handleSnapToStore(e.target.value)}
          >
            <option value="Semua">Semua Store (Snap)</option>
            {stores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none hover:bg-muted/60 transition-colors cursor-pointer text-white"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="Semua">Semua Departemen</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("list")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all hover:bg-background/60 hover:text-foreground", viewMode === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all hover:bg-background/60 hover:text-foreground", viewMode === "grid" ? "bg-background shadow text-foreground" : "text-muted-foreground")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grid
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto pr-1 pb-4", viewMode === "grid" ? "grid grid-cols-3 gap-2 content-start" : "flex flex-col gap-2")}>
          {logs.map((log: any) => {
            const coords = getCoords(log)
            
            // Map status to Indonesian label
            const displayStatusMap: Record<string, string> = {
              PRESENT: "Hadir",
              LATE: "Telat",
              ALPHA: "Alpha",
              ON_LEAVE: "Izin/Cuti",
              SICK: "Sakit",
              FORGOT_CHECKOUT: "Lupa Check-out",
              FORGOT_CHECKIN: "Lupa Check-in",
              BELUM_ABSEN: "Belum Absen",
              TIDAK_ABSEN: "Tidak Absen",
              HOLIDAY: "Libur",
            }
            let statusLabel = displayStatusMap[log.displayStatus] || "Belum Absen"
            
            // Adjust Check Out missing status
            if (mapMode === "checkOut" && !log.attendance?.checkOutTime) {
              if (log.attendance?.checkInTime) {
                statusLabel = "Belum Checkout"
              }
            }

            const isAnomaly = getIsAnomaly(log, mapMode)
            
            let isLembur = false
            if (mapMode === "checkOut" && log.attendance?.checkOutTime && log.employee?.shift?.endTime) {
              const checkOutTime = new Date(log.attendance.checkOutTime)
              const [endH, endM] = log.employee.shift.endTime.split(':').map(Number)
              const formatter = new Intl.DateTimeFormat("id-ID", { hour: "numeric", minute: "numeric", timeZone: "Asia/Jakarta" })
              const formatted = formatter.format(checkOutTime)
              const [coH, coM] = formatted.replace('.', ':').split(':').map(Number)
              
              if ((coH * 60 + coM) > (endH * 60 + endM + 45)) {
                isLembur = true
              }
            }
            
            let anomalyText = ""
            if (mapMode === "checkIn") {
              anomalyText = isAnomaly ? "Telat" : "Tepat Waktu"
            } else {
              if (isAnomaly) anomalyText = "Pulang Cepat"
              else if (isLembur) anomalyText = "Pulang Lembur"
              else anomalyText = "Tepat Waktu"
            }

            const finalText = coords ? anomalyText : statusLabel

            // Search filter
            const matchesSearch = log.employee.name.toLowerCase().includes(search.toLowerCase()) || 
                                  finalText.toLowerCase().includes(search.toLowerCase()) ||
                                  statusLabel.toLowerCase().includes(search.toLowerCase())
            const matchesDept = deptFilter === "Semua" || log.employee.departmentName === deptFilter
            const matchesStore = storeFilter === "Semua" || log.employee.store?.name === storeFilter
            
            const isVisible = matchesSearch && matchesDept && matchesStore
            if (!isVisible) return null

            return (
              <motion.div
                key={log.employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (coords) handleSnapToEmployee(log)
                }}
                className={cn(
                  "rounded-lg border bg-card transition-all",
                  viewMode === "list" ? "p-3" : "p-2 flex flex-col items-center justify-start text-center gap-1.5",
                  coords ? "cursor-pointer hover:border-primary/50" : "opacity-60 grayscale cursor-not-allowed",
                  activeLogId === log.employee.id && coords ? "border-primary ring-1 ring-primary shadow-sm" : ""
                )}
              >
                {viewMode === "list" ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      {log.employee.avatarUrl ? (
                        <img src={log.employee.avatarUrl} alt="" className="h-full w-full object-cover object-center" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                          {log.employee.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-sm text-white">{log.employee.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.employee.store?.name || "Tidak ada store"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">
                        {mapMode === "checkIn" ? (
                          log.attendance?.checkInTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkInTime)) : "--:--"
                        ) : (
                          log.attendance?.checkOutTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkOutTime)) : "--:--"
                        )}
                      </p>
                      <p className={cn("text-[10px] font-semibold mt-0.5", 
                        !coords ? "text-muted-foreground" : (isAnomaly ? "text-destructive" : (isLembur ? "text-orange-500" : "text-emerald-500"))
                      )}>
                        {finalText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted shadow-sm ring-1 ring-border">
                      {log.employee.avatarUrl ? (
                        <img src={log.employee.avatarUrl} alt="" className="h-full w-full object-cover object-center" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground text-xs">
                          {log.employee.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="w-full flex flex-col items-center overflow-hidden">
                      <p className="truncate font-semibold text-[10.5px] leading-tight w-full text-white" title={log.employee.name}>
                        {log.employee.name.split(' ')[0]}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate w-full mt-0.5">
                        {mapMode === "checkIn" ? (
                          log.attendance?.checkInTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkInTime)) : "--:--"
                        ) : (
                          log.attendance?.checkOutTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkOutTime)) : "--:--"
                        )}
                      </p>
                      <div className={cn("mt-1.5 w-full rounded px-1 py-0.5 text-[8.5px] font-bold truncate",
                        !coords ? "bg-muted text-muted-foreground" : (isAnomaly ? "bg-destructive/10 text-destructive" : (isLembur ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"))
                      )}>
                        {finalText}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>
        </div>
      </div>

      {/* MAP CANVAS */}
      <div className="absolute inset-0 overflow-hidden rounded-xl bg-muted z-0">
        <MapContainer center={center} zoom={zoom} maxZoom={22} scrollWheelZoom={true} className="h-full w-full z-0">
          <MapController center={center} zoom={zoom} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
            maxNativeZoom={19}
          />

          {storeObjects.map((store) => {
            if (!store.latitude || !store.longitude) return null
            const isVisible = storeFilter === "Semua" || storeFilter === store.name
            if (!isVisible) return null
            return (
              <React.Fragment key={store.id}>
                <Circle 
                  center={[store.latitude, store.longitude]} 
                  radius={100} 
                  pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }} 
                />
                <Marker
                  position={[store.latitude, store.longitude]}
                icon={L.divIcon({
                  className: "custom-leaflet-marker",
                  html: `<div class="w-12 h-12 flex flex-col items-center justify-center bg-transparent"><div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg></div><div class="mt-1 bg-white/90 px-2 py-0.5 rounded shadow text-[10px] font-bold text-center whitespace-nowrap">${store.name}</div></div>`,
                  iconSize: [48, 48],
                  iconAnchor: [24, 24],
                  popupAnchor: [0, -24],
                })}
                zIndexOffset={0}
              >
                <Popup className="custom-popup">
                  <div className="p-1 text-center">
                    <p className="font-bold text-sm">{store.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lokasi Toko</p>
                  </div>
                </Popup>
              </Marker>
              </React.Fragment>
            )
          })}

          <MarkerClusterGroup
            iconCreateFunction={createClusterCustomIcon}
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

              const isAnomaly = getIsAnomaly(log, mapMode)
              
              let isLembur = false
              if (mapMode === "checkOut" && log.attendance?.checkOutTime && log.employee?.shift?.endTime) {
                const checkOutTime = new Date(log.attendance.checkOutTime)
                const [endH, endM] = log.employee.shift.endTime.split(':').map(Number)
                const formatter = new Intl.DateTimeFormat("id-ID", { hour: "numeric", minute: "numeric", timeZone: "Asia/Jakarta" })
                const formatted = formatter.format(checkOutTime)
                const [coH, coM] = formatted.replace('.', ':').split(':').map(Number)
                
                if ((coH * 60 + coM) > (endH * 60 + endM + 45)) {
                  isLembur = true
                }
              }
              
              let anomalyText = ""
              if (mapMode === "checkIn") {
                anomalyText = isAnomaly ? "Telat" : "Tepat Waktu"
              } else {
                if (isAnomaly) anomalyText = "Pulang Cepat"
                else if (isLembur) anomalyText = "Pulang Lembur"
                else anomalyText = "Tepat Waktu"
              }

              const timeString = mapMode === "checkIn" ? (
                log.attendance?.checkInTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkInTime)) : "--:--"
              ) : (
                log.attendance?.checkOutTime ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(log.attendance.checkOutTime)) : "--:--"
              )

              return (
                <Marker 
                  key={log.employee.id} 
                  position={coords}
                  icon={createProfileIcon(log.employee.avatarUrl, log.employee.name, opacity)}
                  opacity={opacity}
                  zIndexOffset={1000}
                  ref={(m) => {
                    if (m) {
                      markerRefs.current[log.employee.id] = m
                    }
                  }}
                  eventHandlers={{
                    click: () => {
                      // Do not setActiveLogId to avoid full re-render that un-spiderfies the cluster
                    }
                  }}
                >
                  {isFiltered && (
                    <Popup className="custom-popup">
                      <div className="flex flex-col gap-1.5 p-1 min-w-[200px]">
                        <div className="flex items-center gap-3 border-b pb-1.5">
                           <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                            {log.employee.avatarUrl ? (
                              <img src={log.employee.avatarUrl} alt="" className="h-full w-full object-cover object-center" />
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
                        
                        <div className="flex flex-col items-center justify-center text-center rounded bg-muted/50 p-1.5 mt-0.5">
                          <p className="text-[11px] font-medium text-foreground">
                            Waktu : <span className="font-mono font-bold">{timeString}</span>
                          </p>
                          <p className={cn("text-[11px] font-bold mt-0.5", isAnomaly ? "text-destructive" : (isLembur ? "text-orange-500" : "text-emerald-600"))}>
                            {anomalyText}
                          </p>
                        </div>

                        <div className="mt-1 rounded-md overflow-hidden h-24 w-full bg-muted flex flex-col items-center justify-center">
                          {((mapMode === "checkIn" ? log.attendance?.checkInPhotoUrl : log.attendance?.checkOutPhotoUrl)) ? (
                            <img 
                              src={mapMode === "checkIn" ? log.attendance?.checkInPhotoUrl : log.attendance?.checkOutPhotoUrl} 
                              alt="Selfie" 
                              className="h-full w-full object-cover object-center"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground opacity-60">
                              <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">TIDAK ADA FOTO</span>
                            </div>
                          )}
                        </div>
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
        .custom-leaflet-marker, .custom-leaflet-cluster {
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
