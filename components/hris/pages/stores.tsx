"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { Clock, MapPin, Plus, Radius, Users, Edit2, Trash2 } from "lucide-react"
import dynamic from "next/dynamic"

import { createStore, updateStore, deleteStore } from "@/app/actions/store"

const MapPicker = dynamic(() => import("@/components/hris/shared/map-picker"), { 
  ssr: false, 
  loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-md flex items-center justify-center text-xs text-muted-foreground">Memuat Peta...</div> 
})

type Store = any

export function StoresPage({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [isAddOpen, setIsAddOpen] = useState(false)
  // Default coordinates to somewhere central (e.g., Jakarta)
  const [draft, setDraft] = useState({ name: "", address: "", openTime: "08:00", closeTime: "21:00", radiusMeters: 150, lat: -6.200000, lng: 106.816666 })

  const [editTarget, setEditTarget] = useState<Store | null>(null)

  async function handleCreate() {
    if (!draft.name) return toast.error("Nama toko wajib diisi")
    
    const promise = createStore(draft)
    toast.promise(promise, {
      loading: "Menyimpan toko...",
      success: (res) => {
        if (res.success) {
          setStores(prev => [...prev, res.data])
          setIsAddOpen(false)
          setDraft({ name: "", address: "", openTime: "08:00", closeTime: "21:00", radiusMeters: 150, lat: -6.200000, lng: 106.816666 })
          return "Toko berhasil ditambahkan"
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  async function handleUpdate() {
    if (!editTarget) return
    const promise = updateStore(editTarget.id, {
      name: editTarget.name,
      address: editTarget.address,
      openTime: editTarget.openTime,
      closeTime: editTarget.closeTime,
      radiusMeters: editTarget.radiusMeters,
      latitude: editTarget.latitude || editTarget.lat,
      longitude: editTarget.longitude || editTarget.lng
    })
    
    toast.promise(promise, {
      loading: "Memperbarui toko...",
      success: (res) => {
        if (res.success) {
          setStores(prev => prev.map(s => s.id === editTarget.id ? res.data : s))
          setEditTarget(null)
          return "Toko berhasil diperbarui"
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  async function handleDelete(id: string) {
    const promise = deleteStore(id)
    toast.promise(promise, {
      loading: "Menghapus toko...",
      success: (res) => {
        if (res.success) {
          setStores(prev => prev.filter(s => s.id !== id))
          return "Toko berhasil dihapus"
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Kelola Toko"
        desc="Atur lokasi, radius absensi, dan jam operasional toko."
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="store-name">Nama Toko</Label>
                  <Input 
                    id="store-name" 
                    placeholder="cth. HNS Pusat" 
                    className="bg-input" 
                    value={draft.name}
                    onChange={(e) => setDraft({...draft, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Alamat</Label>
                  <Input 
                    id="address" 
                    placeholder="Alamat lengkap toko" 
                    className="bg-input" 
                    value={draft.address}
                    onChange={(e) => setDraft({...draft, address: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lokasi Pin</Label>
                  <div className="h-[200px] w-full rounded-md relative z-0">
                    <MapPicker 
                      position={[draft.lat, draft.lng]} 
                      setPosition={(p) => setDraft({...draft, lat: p[0], lng: p[1]})} 
                      radiusMeters={draft.radiusMeters} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Ketuk peta untuk memindahkan pin. Area biru menunjukkan radius yang valid.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Radius Absensi</Label>
                    <span className="text-sm font-semibold text-foreground">{draft.radiusMeters} m</span>
                  </div>
                  <Slider 
                    value={[draft.radiusMeters]} 
                    onValueChange={(val) => setDraft({...draft, radiusMeters: val[0]})} 
                    min={50} max={1000} step={10} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="open">Jam Buka</Label>
                    <TimePicker 
                      id="open" 
                      value={draft.openTime}
                      onChange={(val) => setDraft({...draft, openTime: val})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="close">Jam Tutup</Label>
                    <TimePicker 
                      id="close" 
                      value={draft.closeTime}
                      onChange={(val) => setDraft({...draft, closeTime: val})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Simpan Toko
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <GlassCard key={s.id} className="group relative w-full overflow-hidden break-words">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30 text-accent-foreground shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground truncate">{s.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditTarget(s)}
                  className="md:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary/20 rounded-md text-muted-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="md:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/20 text-destructive rounded-md">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Toko?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus toko <b>{s.name}</b>? Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.address || "Belum ada alamat"}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Radius className="h-3.5 w-3.5" />
                {s.radiusMeters} m
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {s.openTime} - {s.closeTime}
              </span>
            </div>
          </GlassCard>
        ))}
        {stores.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground text-sm">
            Belum ada toko yang ditambahkan
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Toko</DialogTitle>
                <DialogDescription>Ubah detail toko.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nama Toko</Label>
                  <Input 
                    className="bg-input" 
                    value={editTarget.name}
                    onChange={(e) => setEditTarget({...editTarget, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Alamat</Label>
                  <Input 
                    className="bg-input" 
                    value={editTarget.address || ''}
                    onChange={(e) => setEditTarget({...editTarget, address: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lokasi Pin</Label>
                  <div className="h-[200px] w-full rounded-md relative z-0">
                    <MapPicker 
                      position={[editTarget.latitude || editTarget.lat || -6.2, editTarget.longitude || editTarget.lng || 106.8]} 
                      setPosition={(p) => setEditTarget({...editTarget, latitude: p[0], longitude: p[1]})} 
                      radiusMeters={editTarget.radiusMeters} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Radius Absensi</Label>
                    <span className="text-sm font-semibold text-foreground">{editTarget.radiusMeters} m</span>
                  </div>
                  <Slider 
                    value={[editTarget.radiusMeters]} 
                    onValueChange={(val) => setEditTarget({...editTarget, radiusMeters: val[0]})} 
                    min={50} max={1000} step={10} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jam Buka</Label>
                    <TimePicker 
                      value={editTarget.openTime}
                      onChange={(val) => setEditTarget({...editTarget, openTime: val})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jam Tutup</Label>
                    <TimePicker 
                      value={editTarget.closeTime}
                      onChange={(val) => setEditTarget({...editTarget, closeTime: val})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdate} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
