"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GlassCard } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import {
  Calendar as CalendarIcon,
  Check,
  ClipboardList,
  Plus,
  X,
  ExternalLink,
  Search,
  ChevronLeft,
  Clock,
  Stethoscope,
  User,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Timer,
  Ban,
} from "lucide-react"
import { submitOvertimeRequest } from "@/app/actions/overtime"
import { submitLeaveRequest, approveLeaveRequest, type getAllLeaveRequests, type getMyLeaveRequests } from "@/app/actions/leave"
import type { getMyLeaveQuota } from "@/app/actions/leave"

type LeaveRequest = Awaited<ReturnType<typeof getMyLeaveRequests>>[number]
export type AllRequest = Awaited<ReturnType<typeof getAllLeaveRequests>>[number]
type LeaveQuota = Awaited<ReturnType<typeof getMyLeaveQuota>>

type Role = "employee" | "hrd"

const LEAVE_TYPES = [
  { id: "ANNUAL_LEAVE", label: "Cuti Tahunan", desc: "Cuti berbayar tahunan", icon: CalendarIcon, color: "text-blue-500 bg-blue-500/10" },
  { id: "SICK", label: "Sakit", desc: "Wajib lampirkan surat dokter", icon: Stethoscope, color: "text-red-500 bg-red-500/10" },
  { id: "PERSONAL", label: "Keperluan Pribadi", desc: "Urusan mendesak pribadi", icon: User, color: "text-orange-500 bg-orange-500/10" },
  { id: "HALF_DAY", label: "Setengah Hari", desc: "Izin separuh hari kerja", icon: Timer, color: "text-purple-500 bg-purple-500/10" },
] as const

const LEAVE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  ANNUAL_LEAVE: { label: "Cuti Tahunan", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-l-blue-500" },
  SICK:         { label: "Sakit",         icon: Stethoscope, color: "text-red-500",    bg: "bg-red-500/10",    border: "border-l-red-500" },
  PERSONAL:     { label: "Keperluan Pribadi", icon: User,    color: "text-orange-500", bg: "bg-orange-500/10", border: "border-l-orange-500" },
  HALF_DAY:     { label: "Setengah Hari", icon: Timer,       color: "text-purple-500", bg: "bg-purple-500/10", border: "border-l-purple-500" },
  OVERTIME:     { label: "Lembur",        icon: Clock,       color: "text-emerald-500",bg: "bg-emerald-500/10",border: "border-l-emerald-500" },
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PENDING:  { label: "Menunggu",  icon: AlertCircle,  color: "text-yellow-500", bg: "bg-yellow-500/10" },
  APPROVED: { label: "Disetujui", icon: CheckCircle2, color: "text-emerald-500",bg: "bg-emerald-500/10" },
  REJECTED: { label: "Ditolak",   icon: Ban,          color: "text-red-500",    bg: "bg-red-500/10" },
  CANCELLED:{ label: "Dibatalkan",icon: X,            color: "text-muted-foreground", bg: "bg-muted" },
}

const STATUS_FILTER = ["all", "PENDING", "APPROVED", "REJECTED"] as const
type LeaveStatus = (typeof STATUS_FILTER)[number]

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function calculateWorkingDays(startDate: Date, endDate: Date, weeklyOffDays: number[], holidays: string[]) {
  const start = new Date(startDate.setHours(0, 0, 0, 0))
  const end = new Date(endDate.setHours(0, 0, 0, 0))
  const holidayMs = holidays.map(h => new Date(h).setHours(0, 0, 0, 0))
  
  let workingDays = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (weeklyOffDays.includes(dayOfWeek)) continue
    if (holidayMs.includes(d.getTime())) continue
    workingDays++
  }
  return workingDays
}

// ─── REQUEST FORM ──────────────────────────────────────────────────────────────

function RequestForm({ userId, weeklyOffDays, holidays, onDone }: { userId: string; weeklyOffDays: number[]; holidays: string[]; onDone: () => void }) {
  const [type, setType] = useState<"ANNUAL_LEAVE" | "SICK" | "PERSONAL" | "HALF_DAY">("ANNUAL_LEAVE")
  const [date, setDate] = useState<{ from?: Date; to?: Date } | undefined>()
  const [reason, setReason] = useState("")
  const [halfDayType, setHalfDayType] = useState<"LATE_IN" | "EARLY_OUT">("LATE_IN")
  const [halfDayTime, setHalfDayTime] = useState("")
  const [isPending, startTransition] = useTransition()

  let calculatedDays = 0
  if (date?.from && date?.to) {
    if (type === "HALF_DAY") {
      calculatedDays = 1 // As per user request, Half Day consumes 1 day
    } else {
      calculatedDays = calculateWorkingDays(date.from, date.to, weeklyOffDays, holidays)
    }
  }

  const handleSubmit = () => {
    if (!date?.from || !date?.to) return toast.error("Pilih rentang tanggal.")
    const start = date.from
    const end = date.to
    if (end < start) return toast.error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.")
    if (type === "HALF_DAY" && !halfDayTime) return toast.error("Pilih waktu untuk izin setengah hari.")
    if (calculatedDays === 0 && type !== "HALF_DAY") return toast.error("Tidak ada hari kerja pada rentang tanggal ini.")

    startTransition(async () => {
      const res = await submitLeaveRequest({
        userId,
        type,
        startDate: start,
        endDate: end,
        totalDays: calculatedDays,
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
          {LEAVE_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  type === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Rentang Tanggal</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal bg-input", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>{format(date.from, "LLL dd, y", { locale: localeID })} – {format(date.to, "LLL dd, y", { locale: localeID })}</>
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
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
        {date?.from && date?.to && (
          <p className="mt-1 text-xs text-muted-foreground font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {calculatedDays} hari kerja akan digunakan
          </p>
        )}
      </div>

      {type === "HALF_DAY" && (
        <div className="grid gap-3 sm:grid-cols-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="space-y-1.5">
            <Label>Tipe Izin Setengah Hari</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
              value={halfDayType}
              onChange={(e) => setHalfDayType(e.target.value as any)}
            >
              <option value="LATE_IN">Setengah Hari Masuk (Telat Datang)</option>
              <option value="EARLY_OUT">Setengah Hari Pulang (Pulang Cepat)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Jam (WIB)</Label>
            <TimePicker value={halfDayTime} onChange={setHalfDayTime} />
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

function HrdView({ allRequests }: { allRequests: AllRequest[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 15
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<LeaveStatus>("all")
  const [rejectReason, setRejectReason] = useState("")
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [month, setMonth] = useState<number>(new Date().getMonth())
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const handleApprove = (id: string, approve: boolean, name: string, reason?: string) => {
    startTransition(async () => {
      const res = await approveLeaveRequest(id, approve, reason)
      if (res.success) {
        toast.success(approve ? "Izin disetujui" : "Izin ditolak", {
          description: `Pengajuan ${name} ${approve ? "disetujui" : "ditolak"}.`,
        })
        setRejectTargetId(null)
        setRejectReason("")
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
        toast.success("Surat sakit terverifikasi", { description: `Izin sakit ${name} sekarang berstatus Paid Leave.` })
      } else {
        toast.error(res.error)
      }
    })
  }

  const filtered = allRequests.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!r.user.name.toLowerCase().includes(s) && !r.reason?.toLowerCase().includes(s) && !LEAVE_TYPE_CONFIG[r.type]?.label.toLowerCase().includes(s)) return false
    }
    const rDate = new Date(r.startDate)
    if (rDate.getMonth() !== month || rDate.getFullYear() !== year) return false
    if (tab !== "all" && r.status !== tab) return false
    return true
  })

  const isExpired = (endDate: Date) => Date.now() > new Date(endDate).getTime() + 86400000
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(0, i).toLocaleString('id-ID', { month: 'long' }),
  }))

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Riwayat & Approval Izin</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} pengajuan ditemukan</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, tipe, atau alasan..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 bg-background"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s]
          const Icon = cfg?.icon
          const isActive = tab === s
          return (
            <button
              key={s}
              onClick={() => { setTab(s); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {s === "all" ? "Semua" : cfg?.label}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s === "all"
                  ? filtered.length
                  : allRequests.filter(r => {
                    const rDate = new Date(r.startDate)
                    return rDate.getMonth() === month && rDate.getFullYear() === year && r.status === s
                  }).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Request Cards */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {paginated.map((r) => {
            const cfg = LEAVE_TYPE_CONFIG[r.type] ?? LEAVE_TYPE_CONFIG.ANNUAL_LEAVE
            const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING
            const Icon = cfg.icon
            const StatusIcon = statusCfg.icon
            const expired = isExpired(r.endDate)
            const initials = getInitials(r.user.name)

            return (
              <GlassCard
                key={r.id}
                className={cn("overflow-hidden border-l-4 p-0", cfg.border)}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-3">
                    {/* Employee Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground overflow-hidden">
                      {r.user.avatarUrl ? <img src={r.user.avatarUrl} alt={r.user.name} className="h-full w-full object-cover" /> : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{r.user.name}</p>
                        {/* Leave type badge */}
                        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.color, cfg.bg)}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {new Date(r.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        {" "}&mdash;{" "}
                        {new Date(r.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                          {Math.ceil(r.totalDays)} hari
                        </span>
                      </p>
                      {r.reason && (
                        <p className="mt-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground">
                          {r.reason}
                        </p>
                      )}
                      {r.status === 'REJECTED' && r.rejectReason && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <Ban className="h-3 w-3" /> {r.rejectReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                    {/* Status badge */}
                    <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusCfg.color, statusCfg.bg)}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </span>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid && (
                        <div className="flex gap-2">
                          {(r as any).sickNoteUrl && (
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => window.open((r as any).sickNoteUrl, '_blank')}>
                              <ExternalLink className="h-3.5 w-3.5" /> Lihat Surat
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs"
                            disabled={isPending || !(r as any).sickNoteUrl || expired}
                            onClick={() => handleVerify(r.id, r.user.name)}
                          >
                            <Check className="h-3.5 w-3.5" /> Verifikasi
                          </Button>
                        </div>
                      )}

                      {!(r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid) && !expired && (
                        <>
                          <Dialog open={rejectTargetId === r.id} onOpenChange={(open) => {
                            if (!open) { setRejectTargetId(null); setRejectReason("") }
                            else setRejectTargetId(r.id)
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 text-xs" disabled={isPending}>
                                <X className="h-3.5 w-3.5" /> Tolak
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Tolak Pengajuan</DialogTitle>
                                <DialogDescription>Berikan alasan penolakan untuk {r.user.name}.</DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Label>Alasan Penolakan</Label>
                                <Input className="mt-2" placeholder="Tidak diizinkan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRejectTargetId(null)}>Batal</Button>
                                <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleApprove(r.id, false, r.user.name, rejectReason)} disabled={isPending}>
                                  {isPending ? "Memproses..." : "Konfirmasi Tolak"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {r.status !== 'APPROVED' && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs"
                              disabled={isPending}
                              onClick={() => handleApprove(r.id, true, r.user.name)}
                            >
                              <Check className="h-3.5 w-3.5" /> Setujui
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <div className="text-sm font-medium text-muted-foreground">
            Halaman {page} dari {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gap-1.5"
          >
            Selanjutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <div className="text-sm font-medium text-muted-foreground">
            Halaman {page} dari {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gap-1.5"
          >
            Selanjutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── EMPLOYEE VIEW ─────────────────────────────────────────────────────────────

function RequestLemburForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState<Date>()
  const [startTime, setStartTime] = useState<Date>()
  const [endTime, setEndTime] = useState<Date>()
  const [task, setTask] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !startTime || !endTime || !task) return toast.error("Mohon lengkapi semua field")

    const sTime = new Date(date)
    sTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)
    
    const eTime = new Date(date)
    eTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

    if (eTime <= sTime) {
      return toast.error("Waktu selesai harus lebih dari waktu mulai")
    }

    startTransition(async () => {
      const res = await submitOvertimeRequest({
        overtimeDate: date,
        startTime: sTime,
        endTime: eTime,
        task
      })
      if (res.success) {
        toast.success("Lembur berhasil diajukan")
        onDone()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tanggal Lembur (Bisa pilih tanggal sebelumnya)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: localeID }) : <span>Pilih Tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jam Mulai</Label>
          <TimePicker date={startTime} setDate={setStartTime} />
        </div>
        <div className="space-y-2">
          <Label>Jam Selesai</Label>
          <TimePicker date={endTime} setDate={setEndTime} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tugas / Pekerjaan</Label>
        <Textarea placeholder="Jelaskan apa yang dikerjakan saat lembur..." value={task} onChange={e => setTask(e.target.value)} required />
      </div>
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>Batal</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Mengajukan..." : "Ajukan Lembur"}</Button>
      </DialogFooter>
    </form>
  )
}

function EmployeeView({ userId, leaveRequests, leaveQuota, weeklyOffDays, holidays }: {
  userId: string
  leaveRequests: LeaveRequest[]
  leaveQuota: LeaveQuota
  weeklyOffDays: number[]
  holidays: string[]
}) {
  const [open, setOpen] = useState(false)
  const [openLembur, setOpenLembur] = useState(false)
  const [tab, setTab] = useState<LeaveStatus>("all")
  const [isUploading, setIsUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 15

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
      } catch {
        toast.error("Gagal menghubungi server")
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  let filtered = tab === "all" ? leaveRequests : leaveRequests.filter((r) => r.status === tab)
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(r => r.reason?.toLowerCase().includes(s) || LEAVE_TYPE_CONFIG[r.type]?.label.toLowerCase().includes(s))
  }
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const usedPercent = Math.min(100, (leaveQuota.used / leaveQuota.total) * 100)

  return (
    <div className="relative space-y-5">
      {/* Quota Summary */}
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Kuota Cuti Tahunan</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Periode kerja berjalan</p>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {leaveQuota.remaining}
            <span className="text-sm font-normal text-muted-foreground"> / {leaveQuota.total} hari</span>
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usedPercent >= 80 ? "bg-destructive" : usedPercent >= 50 ? "bg-yellow-500" : "bg-emerald-500"
            )}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{leaveQuota.used} hari terpakai</span>
          <span>{leaveQuota.remaining} hari tersisa</span>
        </div>
      </GlassCard>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari tipe atau alasan..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 bg-background"
        />
      </div>

      {/* Filter tabs + Submit button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
            const cfg = s === "all" ? null : STATUS_CONFIG[s]
            const isActive = tab === s
            return (
              <button
                key={s}
                onClick={() => { setTab(s); setPage(1); }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {s === "all" ? "Semua" : cfg?.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Izin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajukan Izin / Cuti</DialogTitle>
              <DialogDescription>Lengkapi formulir berikut untuk mengajukan izin.</DialogDescription>
            </DialogHeader>
            <RequestForm userId={userId} weeklyOffDays={weeklyOffDays} holidays={holidays} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={openLembur} onOpenChange={setOpenLembur}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-1.5 flex-1 sm:flex-none text-primary border-primary/20 hover:bg-primary/10">
              <Timer className="h-4 w-4" /> Lembur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajukan Lembur</DialogTitle>
              <DialogDescription>Lengkapi formulir untuk mencatat jam lembur Anda.</DialogDescription>
            </DialogHeader>
            <RequestLemburForm onDone={() => setOpenLembur(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Leave Request Cards */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {paginated.map((r) => {
            const cfg = LEAVE_TYPE_CONFIG[r.type] ?? LEAVE_TYPE_CONFIG.ANNUAL_LEAVE
            const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING
            const Icon = cfg.icon
            const StatusIcon = statusCfg.icon

            return (
              <GlassCard key={r.id} className={cn("overflow-hidden border-l-4 p-0", cfg.border)}>
                <div className="flex items-start gap-3 p-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{cfg.label}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3 shrink-0" />
                          {new Date(r.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          {" "}&mdash;{" "}
                          {new Date(r.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          <span className="font-medium text-foreground">{Math.ceil(r.totalDays)} hari</span>
                        </p>
                        {r.reason && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{r.reason}</p>}
                        {r.status === 'REJECTED' && (r as any).rejectReason && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <Ban className="h-3 w-3" /> {(r as any).rejectReason}
                          </p>
                        )}
                      </div>
                      {/* Status badge */}
                      <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", statusCfg.color, statusCfg.bg)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Sick note upload / view */}
                    {r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid && !(r as any).sickNoteUrl && (
                      <div className="mt-2">
                        <input type="file" id={`file-${r.id}`} className="hidden" accept="image/*,.pdf" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(r.id, file)
                        }} />
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 border-primary/40 text-primary text-xs" disabled={isUploading} onClick={() => document.getElementById(`file-${r.id}`)?.click()}>
                          {isUploading ? "Mengunggah..." : "Unggah Surat Dokter"}
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {r.type === 'SICK' && (r as any).sickNoteUrl && (
                      <Button size="sm" variant="ghost" className="mt-2 h-7 gap-1 px-2 text-xs" onClick={() => window.open((r as any).sickNoteUrl, '_blank')}>
                        <ExternalLink className="h-3 w-3" /> Lihat Surat Dokter
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function LeavePage(
  props:
    | { role: "hrd"; allRequests: AllRequest[] }
    | { role: "employee"; userId: string; leaveRequests: LeaveRequest[]; leaveQuota: LeaveQuota; weeklyOffDays: number[]; holidays: string[] }
) {
  if (props.role === "hrd") return <HrdView allRequests={props.allRequests} />
  return <EmployeeView userId={props.userId} leaveRequests={props.leaveRequests} leaveQuota={props.leaveQuota} weeklyOffDays={props.weeklyOffDays} holidays={props.holidays} />
}

function EmptyState() {
  return (
    <GlassCard className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Belum ada data</p>
        <p className="text-sm text-muted-foreground">Tidak ada pengajuan pada kategori ini.</p>
      </div>
    </GlassCard>
  )
}
