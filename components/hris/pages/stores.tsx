"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { STORES } from "@/lib/hris-data"
import { Clock, MapPin, Plus, Radius, Users } from "lucide-react"

function StoreForm({ onDone }: { onDone: () => void }) {
  const [radius, setRadius] = useState([150])
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="store-name">Nama Toko</Label>
        <Input id="store-name" placeholder="cth. HNS Pusat" className="bg-input" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" placeholder="Alamat lengkap toko" className="bg-input" />
      </div>
      <div className="space-y-1.5">
        <Label>Lokasi Pin</Label>
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground">
          <MapPin className="h-6 w-6" />
          <p className="text-xs">Placeholder peta — ketuk untuk menjatuhkan pin lokasi</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Radius Absensi</Label>
          <span className="text-sm font-semibold text-foreground">{radius[0]} m</span>
        </div>
        <Slider value={radius} onValueChange={setRadius} min={50} max={1000} step={10} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="open">Jam Buka</Label>
          <Input id="open" type="time" className="bg-input" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="close">Jam Tutup</Label>
          <Input id="close" type="time" className="bg-input" />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            toast.success("Toko disimpan")
            onDone()
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Simpan Toko
        </Button>
      </DialogFooter>
    </div>
  )
}

export function StoresPage() {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Kelola Toko"
        desc="Atur lokasi, radius absensi, dan jam operasional toko."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Tambah Toko
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Toko</DialogTitle>
                <DialogDescription>Lengkapi detail lokasi toko.</DialogDescription>
              </DialogHeader>
              <StoreForm onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {STORES.map((s) => (
          <GlassCard key={s.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30 text-accent-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {s.employees}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.address}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Radius className="h-3.5 w-3.5" />
                {s.radius} m
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {s.hours}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
