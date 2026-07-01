"use client"

import { useState, useTransition } from "react"
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
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { Calendar as CalendarIcon, Check, ClipboardList, Plus, X, ExternalLink } from "lucide-react"
import { submitLeaveRequest, approveLeaveRequest, type getPendingLeaveRequests, type getMyLeaveRequests } from "@/app/actions/leave"
import type { getMyLeaveQuota } from "@/app/actions/leave"

type LeaveRequest = Awaited<ReturnType<typeof getMyLeaveRequests>>[number]
type PendingRequest = Awaited<ReturnType<typeof getPendingLeaveRequests>>[number]
type LeaveQuota = Awaited<ReturnType<typeof getMyLeaveQuota>>

type Role = "employee" | "hrd"

const LEAVE_TYPES = [
  { id: "ANNUAL_LEAVE", label: "Cuti Tahunan", desc: "Cuti berbayar tahunan" },
  { id: "SICK", label: "Sakit", desc: "Wajib lampirkan surat dokter" },
  { id: "PERSONAL", label: "Keperluan Pribadi", desc: "Urusan mendesak pribadi" },
  { id: "HALF_DAY", label: "Setengah Hari", desc: "Izin separuh hari kerja" },
] as const

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL_LEAVE: "Cuti Tahunan",
  SICK: "Sakit",
  PERSONAL: "Keperluan Pribadi",
  HALF_DAY: "Setengah Hari",
  OVERTIME: "Lembur",
}

const STATUS_FILTER = ["all", "PENDING", "APPROVED", "REJECTED"] as const
type StatusFilter = (typeof STATUS_FILTER)[number]

function RequestForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [type, setType] = useState<"ANNUAL_LEAVE" | "SICK" | "PERSONAL" | "HALF_DAY">("ANNUAL_LEAVE")
  const [date, setDate] = useState<{ from?: Date; to?: Date } | undefined>()
  const [reason, setReason] = useState("")
  const [halfDayType, setHalfDayType] = useState<"LATE_IN" | "EARLY_OUT">("LATE_IN")
  const [halfDayTime, setHalfDayTime] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!date?.from || !date?.to) return toast.error("Pilih rentang tanggal.")
    const start = date.from
    const end = date.to
    if (end < start) return toast.error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.")
    if (type === "HALF_DAY" && !halfDayTime) return toast.error("Pilih waktu untuk izin setengah hari.")

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    startTransition(async () => {
      const res = await submitLeaveRequest({
        userId,
        type,
        startDate: start,
        endDate: end,
        totalDays: diffDays,
        reason,
        halfDayType: type === "HALF_DAY" ? halfDayType : undefined,
        halfDayTime: type === "HALF_DAY" ? halfDayTime : undefined,
      })
      if (res.success) {
        toast.success("Pengajuan terkirim", { description: "Menunggu persetujuan HRD." })
        onDone()
      } else {
        toast.error(res.error)
      }
    })
  }

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
                type === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
              )}
            >
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Rentang Tanggal</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal bg-input",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y", { locale: localeID })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: localeID })}
                  </>
                ) : (
                  format(date.from, "LLL dd, y", { locale: localeID })
                )
              ) : (
                <span>Pilih rentang tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date as any}
              onSelect={setDate as any}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {type === "HALF_DAY" && (
        <div className="grid gap-3 sm:grid-cols-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="space-y-1.5">
            <Label>Tipe Izin Setengah Hari</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={halfDayType}
              onChange={(e) => setHalfDayType(e.target.value as any)}
            >
              <option value="LATE_IN">Setengah Hari Masuk (Telat Datang)</option>
              <option value="EARLY_OUT">Setengah Hari Pulang (Pulang Cepat)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Jam (WIB)</Label>
            <Input 
              type="time" 
              className="bg-input" 
              value={halfDayTime} 
              onChange={(e) => setHalfDayTime(e.target.value)} 
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reason">Alasan</Label>
        <Textarea id="reason" placeholder="Jelaskan alasan pengajuan Anda..." className="bg-input" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isPending ? "Mengirim..." : "Ajukan Izin"}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── HRD VIEW ─────────────────────────────────────────────────────────────────

function HrdView({ pendingRequests }: { pendingRequests: PendingRequest[] }) {
  const [isPending, startTransition] = useTransition()

  const handleApprove = (id: string, approve: boolean, name: string) => {
    startTransition(async () => {
      const res = await approveLeaveRequest(id, approve)
      if (res.success) {
        toast.success(approve ? "Izin disetujui" : "Izin ditolak", {
          description: `Pengajuan ${name} ${approve ? "disetujui" : "ditolak"}.`,
        })
      } else {
        toast.error(res.error)
      }
    })
  }

  const handleVerify = (id: string, name: string) => {
    startTransition(async () => {
      // @ts-ignore
      const res = await import('@/app/actions/leave').then(m => m.verifySickLeave(id, true))
      if (res.success) {
        toast.success("Surat sakit terverifikasi", {
          description: `Izin sakit ${name} sekarang berstatus Paid Leave.`,
        })
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Approval Izin & Cuti</h2>
      {pendingRequests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((r) => (
            <GlassCard key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {r.user.name} <span className="font-normal text-muted-foreground">· {LEAVE_TYPE_LABELS[r.type] ?? r.type}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.startDate).toLocaleDateString("id-ID")} — {new Date(r.endDate).toLocaleDateString("id-ID")} · {Math.ceil(r.totalDays)} hari
                  </p>
                  {r.reason && <p className="mt-1 text-sm text-foreground">{r.reason}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {r.status === 'APPROVED' && r.type === 'SICK' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {(r as any).sickNoteUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => window.open((r as any).sickNoteUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" /> Lihat Surat
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90"
                      disabled={isPending || !(r as any).sickNoteUrl}
                      onClick={() => handleVerify(r.id, r.user.name)}
                      title={!(r as any).sickNoteUrl ? "Menunggu karyawan upload surat" : "Verifikasi"}
                    >
                      <Check className="h-4 w-4" /> Verifikasi Surat
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleApprove(r.id, false, r.user.name)}
                    >
                      <X className="h-4 w-4" /> Tolak
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90"
                      disabled={isPending}
                      onClick={() => handleApprove(r.id, true, r.user.name)}
                    >
                      <Check className="h-4 w-4" /> Setujui
                    </Button>
                  </>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EMPLOYEE VIEW ─────────────────────────────────────────────────────────────

function EmployeeView({ userId, leaveRequests, leaveQuota }: {
  userId: string
  leaveRequests: LeaveRequest[]
  leaveQuota: LeaveQuota
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<StatusFilter>("all")
  const [isUploading, setIsUploading] = useState(false)
  
  const handleUpload = async (id: string, file: File) => {
    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload/sick-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64: reader.result, userId })
        })
        const data = await res.json()
        if (data.url) {
          const m = await import('@/app/actions/leave')
          await m.uploadSickNote(id, data.url, file.name)
          toast.success("Surat sakit berhasil diunggah")
        } else {
          toast.error(data.error || "Gagal unggah")
        }
      } catch (err) {
        toast.error("Gagal menghubungi server")
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const filtered = tab === "all" ? leaveRequests : leaveRequests.filter((r) => r.status === tab)

  return (
    <div className="relative space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Kuota", value: leaveQuota.total },
          { label: "Terpakai", value: leaveQuota.used },
          { label: "Sisa", value: leaveQuota.remaining },
        ].map((q) => (
          <GlassCard key={q.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{q.value}</p>
            <p className="text-xs text-muted-foreground">{q.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusFilter)} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Disetujui</TabsTrigger>
            <TabsTrigger value="REJECTED">Ditolak</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Ajukan Izin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajukan Izin / Cuti</DialogTitle>
              <DialogDescription>Lengkapi formulir berikut untuk mengajukan izin.</DialogDescription>
            </DialogHeader>
            <RequestForm userId={userId} onDone={() => setOpen(false)} />
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
                  <p className="text-sm font-semibold text-foreground">{LEAVE_TYPE_LABELS[r.type] ?? r.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.startDate).toLocaleDateString("id-ID")} — {new Date(r.endDate).toLocaleDateString("id-ID")} · {Math.ceil(r.totalDays)} hari
                  </p>
                  {r.reason && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.reason}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={r.status.toLowerCase() as any} />
                {r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid && !(r as any).sickNoteUrl && (
                  <div>
                    <input 
                      type="file" 
                      id={`file-${r.id}`} 
                      className="hidden" 
                      accept="image/*,.pdf" 
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(r.id, file)
                      }} 
                    />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs h-7 px-2 border-primary text-primary"
                        disabled={isUploading}
                        onClick={() => document.getElementById(`file-${r.id}`)?.click()}
                      >
                        {isUploading ? "Mengunggah..." : "Unggah Surat Dokter"}
                      </Button>
                    </div>
                )}
                {r.type === 'SICK' && (r as any).sickNoteUrl && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs h-7 px-2"
                    onClick={() => window.open((r as any).sickNoteUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Lihat Surat
                  </Button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function LeavePage(
  props:
    | { role: "hrd"; pendingRequests: PendingRequest[] }
    | { role: "employee"; userId: string; leaveRequests: LeaveRequest[]; leaveQuota: LeaveQuota }
) {
  if (props.role === "hrd") return <HrdView pendingRequests={props.pendingRequests} />
  return <EmployeeView userId={props.userId} leaveRequests={props.leaveRequests} leaveQuota={props.leaveQuota} />
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
