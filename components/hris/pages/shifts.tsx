"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Clock, Plus, Users, Trash2, Edit2 } from "lucide-react"

import { createShift, updateShift, deleteShift } from "@/app/actions/shift"

// Using any for rapid prototyping, normally would use Prisma's Shift type
type Shift = any

export function ShiftsPage({ initialShifts }: { initialShifts: Shift[] }) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [draft, setDraft] = useState({ name: "", startTime: "08:00", endTime: "17:00", checkinWindowMin: 15 })

  const [editTarget, setEditTarget] = useState<Shift | null>(null)

  async function handleCreate() {
    if (!draft.name) return toast.error("Nama shift wajib diisi")
    
    const promise = createShift(draft)
    toast.promise(promise, {
      loading: "Menyimpan shift...",
      success: (res) => {
        if (res.success) {
          setShifts(prev => [...prev, res.data])
          setIsAddOpen(false)
          setDraft({ name: "", startTime: "08:00", endTime: "17:00", checkinWindowMin: 15 })
          return "Shift berhasil ditambahkan"
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  async function handleUpdate() {
    if (!editTarget) return
    const promise = updateShift(editTarget.id, {
      name: editTarget.name,
      startTime: editTarget.startTime,
      endTime: editTarget.endTime,
      checkinWindowMin: Number(editTarget.checkinWindowMin)
    })
    
    toast.promise(promise, {
      loading: "Memperbarui shift...",
      success: (res) => {
        if (res.success) {
          setShifts(prev => prev.map(s => s.id === editTarget.id ? res.data : s))
          setEditTarget(null)
          return "Shift berhasil diperbarui"
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus shift ini?")) return
    
    const promise = deleteShift(id)
    toast.promise(promise, {
      loading: "Menghapus shift...",
      success: (res) => {
        if (res.success) {
          setShifts(prev => prev.filter(s => s.id !== id))
          return "Shift berhasil dihapus"
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
        title="Kelola Shift"
        desc="Atur jam kerja dan jendela check-in untuk setiap shift."
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Tambah Shift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Shift</DialogTitle>
                <DialogDescription>Tentukan detail shift baru.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shift-name">Nama Shift</Label>
                  <Input 
                    id="shift-name" 
                    placeholder="cth. Pagi / HNS Pusat Pagi" 
                    className="bg-input" 
                    value={draft.name}
                    onChange={(e) => setDraft({...draft, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Jam Mulai</Label>
                    <Input 
                      id="start" 
                      type="time" 
                      className="bg-input" 
                      value={draft.startTime}
                      onChange={(e) => setDraft({...draft, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">Jam Selesai</Label>
                    <Input 
                      id="end" 
                      type="time" 
                      className="bg-input" 
                      value={draft.endTime}
                      onChange={(e) => setDraft({...draft, endTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="window">Jendela Check-in (menit)</Label>
                  <Input 
                    id="window" 
                    type="number" 
                    className="bg-input" 
                    value={draft.checkinWindowMin}
                    onChange={(e) => setDraft({...draft, checkinWindowMin: Number(e.target.value)})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shifts.map((s) => (
          <GlassCard key={s.id} className="group relative">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditTarget(s)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary/20 rounded-md text-muted-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/20 text-destructive rounded-md"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {s.startTime} <span className="text-muted-foreground">-</span> {s.endTime}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Toleransi check-in: {s.checkinWindowMin} menit</p>
          </GlassCard>
        ))}
        {shifts.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground text-sm">
            Belum ada shift yang dibuat
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          {editTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Shift</DialogTitle>
                <DialogDescription>Ubah detail shift.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nama Shift</Label>
                  <Input 
                    className="bg-input" 
                    value={editTarget.name}
                    onChange={(e) => setEditTarget({...editTarget, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jam Mulai</Label>
                    <Input 
                      type="time" 
                      className="bg-input" 
                      value={editTarget.startTime}
                      onChange={(e) => setEditTarget({...editTarget, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jam Selesai</Label>
                    <Input 
                      type="time" 
                      className="bg-input" 
                      value={editTarget.endTime}
                      onChange={(e) => setEditTarget({...editTarget, endTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Jendela Check-in (menit)</Label>
                  <Input 
                    type="number" 
                    className="bg-input" 
                    value={editTarget.checkinWindowMin}
                    onChange={(e) => setEditTarget({...editTarget, checkinWindowMin: Number(e.target.value)})}
                  />
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
