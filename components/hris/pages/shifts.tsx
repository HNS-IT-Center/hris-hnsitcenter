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
import { SHIFTS } from "@/lib/hris-data"
import { Clock, Plus, Users } from "lucide-react"

export function ShiftsPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Kelola Shift"
        desc="Atur jam kerja dan jendela check-in untuk setiap shift."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
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
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shift-name">Nama Shift</Label>
                  <Input id="shift-name" placeholder="cth. Pagi" className="bg-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Jam Mulai</Label>
                    <Input id="start" type="time" className="bg-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">Jam Selesai</Label>
                    <Input id="end" type="time" className="bg-input" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="window">Jendela Check-in (menit)</Label>
                  <Input id="window" type="number" defaultValue={15} className="bg-input" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    toast.success("Shift ditambahkan")
                    setOpen(false)
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHIFTS.map((s) => (
          <GlassCard key={s.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {s.employees}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {s.start} <span className="text-muted-foreground">-</span> {s.end}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Toleransi check-in: {s.window} menit</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
