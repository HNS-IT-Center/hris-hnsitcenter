"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import { Camera, CheckCircle2, MapPin, RotateCcw, Send, AlertTriangle } from "lucide-react"
import { getDistanceInMeters } from "@/lib/utils/geo"
import { submitAttendance } from "@/app/actions/attendance"
import { generateFingerprint } from "@/lib/utils/fingerprint"
import { useRouter } from "next/navigation"
type PermissionState = "idle" | "requesting" | "granted" | "denied"

export function AttendancePage({ user, store, todayRecord }: { user: any, store: any, todayRecord: any }) {
  const router = useRouter()
  const [permState, setPermState] = useState<PermissionState>("idle")
  
  // Geo State
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null)
  const [liveDistance, setLiveDistance] = useState<number | null>(null)
  const geoWatchId = useRef<number | null>(null)
  
  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  
  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isCompleted = todayRecord?.checkInTime && todayRecord?.checkOutTime

  // Stop camera stream when unmounting
  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Bind stream to video element once it's mounted
  useEffect(() => {
    if (permState === 'granted' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [permState, videoRef.current])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const requestPermissions = async () => {
    setPermState("requesting")
    
    try {
      // 1. Request Camera
      await startCamera()
      
      // 2. Request Location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Both granted
          setPermState("granted")
          
          // Start watching position
          if (geoWatchId.current) navigator.geolocation.clearWatch(geoWatchId.current)
          geoWatchId.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              const lat = watchPos.coords.latitude
              const lng = watchPos.coords.longitude
              setLiveLocation({ lat, lng })
              
              if (store) {
                const dist = getDistanceInMeters(lat, lng, store.latitude, store.longitude)
                setLiveDistance(dist)
              }
            },
            (err) => console.warn("Watch position error (non-critical):", err),
            { enableHighAccuracy: true }
          )
        },
        (err) => {
          console.error("Geolocation error", err)
          setPermState("denied")
          stopCamera()
        },
        { enableHighAccuracy: true }
      )
    } catch (err) {
      console.error("Permissions error", err)
      setPermState("denied")
    }
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw current frame
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Compress to WebP (0.8 quality)
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob)
        setCapturedUrl(URL.createObjectURL(blob))
        stopCamera()
      }
    }, "image/webp", 0.8)
  }

  const handleRetake = async () => {
    setCapturedBlob(null)
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
    await startCamera()
  }

  const handleSubmit = async () => {
    if (!liveLocation) return toast.error("Lokasi belum didapatkan. Harap tunggu.")
    if (!capturedBlob) return toast.error("Silakan ambil foto terlebih dahulu.")
    
    if (store && liveDistance !== null && liveDistance > store.radiusMeters) {
      return toast.error(`Anda berada di luar radius toko (${store.radiusMeters} meter).`)
    }

    setIsSubmitting(true)
    
    try {
      // Small artificial delay to prevent freezing UX
      await new Promise(r => setTimeout(r, 500))
      
      const deviceId = await generateFingerprint()
      const userAgent = navigator.userAgent

      // Upload to R2 (Mock for now until API is ready)
      const formData = new FormData()
      formData.append("file", capturedBlob)
      
      // Normally we fetch `/api/upload/attendance` here...
      // For now, we mock a URL:
      const mockPhotoUrl = "https://example.com/mock-attendance.webp"

      // Send to server
      const res = await submitAttendance({
        userId: user.id,
        storeId: store?.id,
        lat: liveLocation.lat,
        lng: liveLocation.lng,
        photoUrl: mockPhotoUrl,
        deviceId,
        userAgent
      })

      if (res.success) {
        toast.success(`Berhasil Check-${res.type === 'check-in' ? 'In' : 'Out'}!`)
        router.push('/dashboard')
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error("Gagal mengirim absensi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4 pt-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold">Absensi Selesai</h2>
        <p className="text-muted-foreground">Anda sudah melakukan Check-in dan Check-out hari ini. Terima kasih!</p>
      </div>
    )
  }

  const isOutOfRange = store && liveDistance !== null && liveDistance > store.radiusMeters
  const actionText = !todayRecord ? "Check-in" : "Check-out"

  if (permState === "idle" || permState === "denied") {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <GlassCard>
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold">Izin Diperlukan</h2>
            <p className="text-muted-foreground text-sm px-4">
              Untuk melakukan absensi, sistem memerlukan akses ke <b>Kamera</b> dan <b>Lokasi (GPS)</b>.
            </p>
            <Button onClick={requestPermissions} size="lg" className="w-full sm:w-auto mt-4">
              {permState === "denied" ? "Coba Minta Izin Lagi" : "Berikan Izin Akses"}
            </Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  if (permState === "requesting") {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <GlassCard>
          <div className="text-center space-y-4 py-10">
            <p className="text-muted-foreground animate-pulse font-medium">Meminta izin kamera dan lokasi...</p>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <GlassCard>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Jarak ke {store?.name || "Pusat"}
          </span>
          <span className={`text-sm font-semibold ${isOutOfRange ? 'text-destructive' : 'text-success'}`}>
            {liveDistance !== null ? `${liveDistance} meter` : "Mencari..."}
          </span>
        </div>
        {isOutOfRange && (
          <p className="mt-2 text-xs text-destructive text-center">
            Anda berada di luar radius yang diizinkan ({store.radiusMeters} meter). Mendekatlah ke lokasi toko.
          </p>
        )}

        {/* Camera / preview area */}
        <div className="relative mt-4 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`h-full w-full object-cover ${capturedUrl ? 'hidden' : 'block'}`}
          />
          {capturedUrl && (
            <img src={capturedUrl} alt="Selfie" className="h-full w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />

          <span className="absolute left-3 top-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background">
            {capturedUrl ? "Pratinjau" : "Live"}
          </span>
        </div>

        {/* Controls */}
        {capturedUrl ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleRetake} className="gap-2" disabled={isSubmitting}>
              <RotateCcw className="h-4 w-4" />
              Ulangi Foto
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isOutOfRange} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
              {isSubmitting ? "Mengirim..." : `Kirim ${actionText}`}
            </Button>
          </div>
        ) : (
          <Button onClick={handleCapture} className="mt-4 h-12 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Camera className="h-5 w-5" />
            Ambil Foto {actionText}
          </Button>
        )}
      </GlassCard>
    </div>
  )
}
