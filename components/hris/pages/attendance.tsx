"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import { CURRENT_USER } from "@/lib/hris-data"
import { Camera, CheckCircle2, MapPin, RotateCcw, Send } from "lucide-react"

export function AttendancePage() {
  const [captured, setCaptured] = useState(false)
  const distance = 10

  const handleCapture = () => {
    setCaptured(true)
    toast.success("Foto berhasil diambil")
  }

  const handleSubmit = () => {
    toast.success("Absensi terkirim", { description: "Lokasi & foto terverifikasi. Terima kasih!" })
    setCaptured(false)
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <GlassCard>
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-success">
            <MapPin className="h-4 w-4" />
            Jarak ke {CURRENT_USER.store}
          </span>
          <span className="text-sm font-semibold text-success">{distance} meter</span>
        </div>

        {/* Camera / preview area */}
        <div className="relative mt-4 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
          {captured ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="text-sm">Pratinjau foto selfie</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Camera className="h-12 w-12" />
              <p className="text-sm">Kamera aktif - posisikan wajah Anda</p>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background">
            {captured ? "Pratinjau" : "Live"}
          </span>
        </div>

        {/* Controls */}
        {captured ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setCaptured(false)} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Ulangi Foto
            </Button>
            <Button onClick={handleSubmit} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
              Submit
            </Button>
          </div>
        ) : (
          <Button onClick={handleCapture} className="mt-4 h-12 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Camera className="h-5 w-5" />
            Ambil Foto
          </Button>
        )}
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground text-pretty">
        Pastikan GPS aktif dan Anda berada dalam radius toko untuk dapat melakukan absensi.
      </p>
    </div>
  )
}
