"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GlassCard, StatusBadge } from "@/components/hris/shared"
import { LEAVE_QUOTA, LEAVE_REQUESTS, PENDING_APPROVALS, type LeaveStatus, type Role } from "@/lib/hris-data"
import { cn } from "@/lib/utils"
import { Calendar, Check, ClipboardList, Plus, Upload, X } from "lucide-react"

const LEAVE_TYPES = [
  { id: "annual", label: "Cuti Tahunan", desc: "Cuti berbayar tahunan" },
  { id: "sick", label: "Sakit", desc: "Wajib lampirkan surat dokter" },
  { id: "personal", label: "Keperluan Pribadi", desc: "Urusan mendesak pribadi" },
  { id: "late", label: "Izin Telat", desc: "Datang terlambat" },
  { id: "halfday", label: "Setengah Hari", desc: "Izin separuh hari kerja" },
]

function RequestForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState("annual")
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Jenis Izin</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEAVE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                type === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
              )}
            >
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="from">Tanggal Mulai</Label>
          <Input id="from" type="date" className="bg-input" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Tanggal Selesai</Label>
          <Input id="to" type="date" className="bg-input" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Alasan</Label>
        <Textarea id="reason" placeholder="Jelaskan alasan pengajuan Anda..." className="bg-input" />
      </div>
      <div className="space-y-1.5">
        <Label>Lampiran (opsional)</Label>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tarik file atau klik untuk unggah surat dokter</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            toast.success("Pengajuan terkirim", { description: "Menunggu persetujuan HRD." })
            onDone()
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Ajukan Izin
        </Button>
      </DialogFooter>
    </div>
  )
}

export function LeavePage({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"all" | LeaveStatus>("all")

  if (role === "hrd") {
    return (
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Approval Izin & Cuti</h2>
        {PENDING_APPROVALS.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {PENDING_APPROVALS.map((r) => (
              <GlassCard key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r.employee} <span className="font-normal text-muted-foreground">· {r.typeLabel}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.dateRange} · {r.duration}
                    </p>
                    <p className="mt-1 text-sm text-foreground">{r.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => toast.error("Izin ditolak", { description: `Pengajuan ${r.employee} ditolak.` })}
                  >
                    <X className="h-4 w-4" />
                    Tolak
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90"
                    onClick={() => toast.success("Izin disetujui", { description: `Pengajuan ${r.employee} disetujui.` })}
                  >
                    <Check className="h-4 w-4" />
                    Setujui
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    )
  }

  const filtered = tab === "all" ? LEAVE_REQUESTS : LEAVE_REQUESTS.filter((r) => r.status === tab)

  return (
    <div className="relative space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Kuota", value: LEAVE_QUOTA.total },
          { label: "Terpakai", value: LEAVE_QUOTA.used },
          { label: "Sisa", value: LEAVE_QUOTA.remaining },
        ].map((q) => (
          <GlassCard key={q.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{q.value}</p>
            <p className="text-xs text-muted-foreground">{q.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Disetujui</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="hidden gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex">
              <Plus className="h-4 w-4" />
              Ajukan Izin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajukan Izin / Cuti</DialogTitle>
              <DialogDescription>Lengkapi formulir berikut untuk mengajukan izin.</DialogDescription>
            </DialogHeader>
            <RequestForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <GlassCard key={r.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.typeLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.dateRange} · {r.duration}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.reason}</p>
                </div>
              </div>
              <StatusBadge status={r.status} />
            </GlassCard>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full bg-primary p-0 text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 sm:hidden"
        aria-label="Ajukan Izin"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <GlassCard className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">Belum ada data</p>
        <p className="text-sm text-muted-foreground">Tidak ada pengajuan pada kategori ini.</p>
      </div>
    </GlassCard>
  )
}
