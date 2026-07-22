"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import { Camera, CheckCircle2, MapPin, RotateCcw, Send, AlertTriangle, ClipboardList, X } from "lucide-react"
import { getDistanceInMeters } from "@/lib/utils/geo"
import { submitAttendance } from "@/app/actions/attendance"
import { generateFingerprint } from "@/lib/utils/fingerprint"
import { useRouter } from "next/navigation"
import { DashboardUser } from "@/components/hris/dashboard-shell"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type PermissionState = "idle" | "requesting" | "granted" | "denied"

interface AttendancePageProps {
  user: DashboardUser & { shift?: { startTime: string; endTime: string; checkinWindowMin: number; checkinWindowEndMin: number } }
  store?: { id: string; name: string; latitude: number; longitude: number; radiusMeters: number }
  todayRecord: any
  approvedLeave?: any
}

export function AttendancePage({ user, store, todayRecord, approvedLeave }: AttendancePageProps) {
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
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false)
  
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
    
    // Draw current frame (Flipped horizontally to match mirror preview)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    
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

    // Client-side Early Check-out Warning
    if ((actionText === "Check-out" || actionText === "Absen Keluar") && user.shift) {
      let shiftEndStr = user.shift.endTime
      if (approvedLeave?.type === 'HALF_DAY' && approvedLeave?.halfDayType === 'EARLY_OUT' && approvedLeave?.halfDayTime) {
        shiftEndStr = approvedLeave.halfDayTime
      }
      const [eh, em] = shiftEndStr.split(':')
      const shiftEndDate = new Date()
      shiftEndDate.setHours(parseInt(eh), parseInt(em), 0, 0)
      
      if (new Date() < shiftEndDate) {
        setShowEarlyCheckout(true)
        return
      }
    }

    await executeSubmit()
  }

  const executeSubmit = async () => {
    setShowEarlyCheckout(false)
    setIsSubmitting(true)
    
    try {
      // Small artificial delay to prevent freezing UX
      await new Promise(r => setTimeout(r, 500))
      
      const deviceId = await generateFingerprint()
      const userAgent = navigator.userAgent

      // Collect a human-readable device name client-side.
      // navigator.userAgentData is available in modern Chromium browsers and gives
      // the real brand + model name (e.g. "Oppo Reno 14 5G"), unlike the raw
      // userAgent string which only exposes model codes like "(K)".
      let deviceName: string | undefined
      try {
        const uaData = (navigator as any).userAgentData
        if (uaData) {
          const highEntropy = await uaData.getHighEntropyValues(['model', 'platform', 'brands'])
          const model = highEntropy.model as string | undefined
          const platform = highEntropy.platform as string | undefined
          const brands = (highEntropy.brands as { brand: string; version: string }[] | undefined)
            ?.filter(b => !b.brand.includes('Not'))
            .map(b => b.brand)
            .join(', ')
          if (model) {
            deviceName = model
          } else if (brands && platform) {
            deviceName = `${platform} — ${brands}`
          } else if (platform) {
            deviceName = platform
          }
        }
      } catch {
        // getHighEntropyValues may be blocked by permissions policy — ignore
      }

      // Convert to Base64 to avoid Next.js FormData parsing issues
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(capturedBlob)
      })
      
      const uploadRes = await fetch('/api/upload/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, userId: user.id })
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Gagal mengunggah foto.")
      }

      const photoUrl = uploadData.url

      // Send to server
      const res = await submitAttendance({
        userId: user.id,
        storeId: store?.id,
        lat: liveLocation.lat,
        lng: liveLocation.lng,
        photoUrl: photoUrl,
        deviceId,
        userAgent,
        deviceName
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

  if (approvedLeave && ['ANNUAL_LEAVE', 'SICK', 'PERSONAL'].includes(approvedLeave.type)) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4 pt-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ClipboardList className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-destructive">Absensi Terkunci</h2>
        <p className="text-muted-foreground">Anda tidak bisa absen karena Anda sedang Izin/Cuti/Sakit.</p>
      </div>
    )
  }

  let actionText = !todayRecord ? "Check-in" : "Check-out"

  // Auto-skip Check-in if missed window
  if (!todayRecord && user.shift) {
    let shiftStartStr = user.shift.startTime
    if (approvedLeave?.type === 'HALF_DAY' && approvedLeave?.halfDayType === 'LATE_IN' && approvedLeave?.halfDayTime) {
      shiftStartStr = approvedLeave.halfDayTime
    }
    const [h, m] = shiftStartStr.split(':')
    const checkinCloseTime = new Date()
    checkinCloseTime.setHours(parseInt(h), parseInt(m), 0, 0)
    checkinCloseTime.setMinutes(checkinCloseTime.getMinutes() + (user.shift.checkinWindowEndMin || 0))
    
    if (new Date() > checkinCloseTime) {
      actionText = "Absen Keluar"
    }
  }

  const isOutOfRange = store && liveDistance !== null && liveDistance > store.radiusMeters

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
    <>
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
          <div className="relative mt-4 flex aspect-[4/5] max-h-[50vh] sm:max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ transform: 'scaleX(-1)' }}
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

      <AlertDialog open={showEarlyCheckout} onOpenChange={setShowEarlyCheckout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulang Lebih Awal?</AlertDialogTitle>
            <AlertDialogDescription>
              Absenmu akan ditandai sebagai pulang lebih awal di sistem, kamu yakin Check-out sekarang?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEarlyCheckout(false)}>
              <X className="mr-2 h-4 w-4" /> Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Ya, Absen Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
