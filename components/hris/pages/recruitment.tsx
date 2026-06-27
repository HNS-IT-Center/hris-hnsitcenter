"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CANDIDATES, type Candidate } from "@/lib/hris-data"
import { Download, Mail, Plus, Upload, UserCheck, UserX } from "lucide-react"

const STAGES: { id: Candidate["stage"]; label: string }[] = [
  { id: "waiting", label: "Waiting Call" },
  { id: "interview1", label: "Interview 1" },
  { id: "interview2", label: "Interview 2" },
  { id: "accepted", label: "Diterima" },
  { id: "rejected", label: "Ditolak" },
]

export function RecruitmentPage() {
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Pipeline Rekrutmen"
        desc="Kelola kandidat di setiap tahap seleksi."
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Tambah Kandidat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kandidat</DialogTitle>
                <DialogDescription>Masukkan informasi kandidat baru.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Nama</Label>
                  <Input id="c-name" placeholder="Nama lengkap" className="bg-input" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" placeholder="email@contoh.com" className="bg-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-pos">Posisi</Label>
                    <Input id="c-pos" placeholder="cth. Designer" className="bg-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-date">Tgl Interview</Label>
                    <Input id="c-date" type="date" className="bg-input" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Upload CV</Label>
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <p className="text-xs">Klik untuk mengunggah CV (PDF)</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    toast.success("Kandidat ditambahkan")
                    setAddOpen(false)
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

      {/* Kanban */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = CANDIDATES.filter((c) => c.stage === stage.id)
          return (
            <div key={stage.id} className="rounded-2xl border border-border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="glass w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.position}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{c.interviewDate}</p>
                  </button>
                ))}
                {items.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Kosong</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Candidate drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.position}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="space-y-2 rounded-xl border border-border bg-card/50 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground">{selected.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interview</span>
                    <span className="font-medium text-foreground">{selected.interviewDate}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Download CV
                </Button>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Aksi Email</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90"
                      onClick={() => toast.success("Email panggilan terkirim", { description: selected.name })}
                    >
                      <UserCheck className="h-4 w-4" />
                      Panggilan
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => toast.error("Email penolakan terkirim", { description: selected.name })}
                    >
                      <UserX className="h-4 w-4" />
                      Penolakan
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Status Timeline</p>
                  <ol className="space-y-3 border-l border-border pl-4">
                    {STAGES.map((s) => {
                      const reachedIdx = STAGES.findIndex((x) => x.id === selected.stage)
                      const idx = STAGES.findIndex((x) => x.id === s.id)
                      const done = idx <= reachedIdx
                      return (
                        <li key={s.id} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                              done ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                          <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
