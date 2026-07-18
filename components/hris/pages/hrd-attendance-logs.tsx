"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { type DateRange } from "react-day-picker"
import { GlassCard } from "@/components/hris/shared"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subMonths, setDate, parseISO } from "date-fns"
import { id } from "date-fns/locale"
import NProgress from 'nprogress'
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  LogOut,
  MapPin,
  UserX,
  Search,
  Map,
  CalendarIcon,
  Download,
  Filter
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { getHrdAttendanceLogs } from "@/app/actions/dashboard"
import { overrideAttendance } from "@/app/actions/attendance"

type LogData = Awaited<ReturnType<typeof getHrdAttendanceLogs>>
type LogEntry = LogData["logs"][number]

type DisplayStatus = "PRESENT" | "LATE" | "ALPHA" | "ON_LEAVE" | "FORGOT_CHECKOUT" | "BELUM_ABSEN" | "HOLIDAY" | "FORGOT_CHECKIN" | "TIDAK_ABSEN"

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; icon: React.ElementType }> = {
  PRESENT: { label: "Hadir", color: "text-success bg-success/10", icon: CheckCircle2 },
  LATE: { label: "Telat", color: "text-warning bg-warning/10", icon: Clock },
  ALPHA: { label: "Alpha", color: "text-destructive bg-destructive/10", icon: UserX },
  ON_LEAVE: { label: "Izin/Cuti", color: "text-secondary bg-secondary/10", icon: LogOut },
  FORGOT_CHECKOUT: { label: "Lupa Check-out", color: "text-warning bg-warning/10", icon: LogOut },
  FORGOT_CHECKIN: { label: "Lupa Check-in", color: "text-destructive bg-destructive/10", icon: UserX },
  BELUM_ABSEN: { label: "Belum Absen", color: "text-muted-foreground bg-muted", icon: HelpCircle },
  TIDAK_ABSEN: { label: "Tidak Absen", color: "text-destructive bg-destructive/15 font-semibold", icon: UserX },
  HOLIDAY: { label: "Libur", color: "text-primary bg-primary/10", icon: CheckCircle2 },
}

const TAB_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "PRESENT", label: "Hadir" },
  { value: "LATE", label: "Telat" },
  { value: "BELUM_ABSEN", label: "Belum Absen" },
  { value: "TIDAK_ABSEN", label: "Tidak Absen" },
  { value: "ON_LEAVE", label: "Izin/Cuti" },
  { value: "ALPHA", label: "Alpha" },
]

function StatusBadge({ status }: { status: DisplayStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.BELUM_ABSEN
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.color)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

function formatTime(dt: Date | string | null | undefined) {
  if (!dt) return "—"
  return new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

export function HrdAttendanceLogs({ initialData }: { initialData: LogData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState("all")
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState<DisplayStatus>("PRESENT")
  const [overrideReason, setOverrideReason] = useState("")
  const [isOverriding, setIsOverriding] = useState(false)
  const [date, setDate] = useState(() => {
    const d = new Date(initialData.date)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  })

  useEffect(() => {
    if (!isPending) {
      NProgress.done()
    }
  }, [isPending])

  // Filters
  const [deptFilter, setDeptFilter] = useState("Semua")
  const [storeFilter, setStoreFilter] = useState("Semua")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Unique lists for filters
  const departments = Array.from(new Set(initialData.logs.map(l => l.employee.departmentName).filter(Boolean))) as string[]
  const stores = Array.from(new Set(initialData.logs.map(l => l.employee.store?.name).filter(Boolean))) as string[]

  const handleOverride = async () => {
    if (!selectedLog) return
    if (!overrideReason.trim()) {
      toast.error("Alasan dispensasi wajib diisi.")
      return
    }
    
    setIsOverriding(true)

    // Build params: prefer attendanceId if record exists, else use userId + date
    const params = selectedLog.attendance
      ? { attendanceId: selectedLog.attendance.id }
      : { userId: selectedLog.employee.id, date: (selectedLog as any).dateStr as string }

    const res = await overrideAttendance(params, overrideStatus as any, overrideReason)
    setIsOverriding(false)
    
    if (res.success) {
      toast.success("Status absensi berhasil diubah")
      setModalOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } else {
      toast.error(res.error)
    }
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    NProgress.start()
    startTransition(() => {
      router.push(`/hrd/attendance?date=${newDate}`)
    })
  }

  // Apply filters
  let filteredLogs = initialData.logs
  if (tab !== "all") {
    filteredLogs = filteredLogs.filter(l => l.displayStatus === tab)
  }
  if (deptFilter !== "Semua") {
    filteredLogs = filteredLogs.filter(l => l.employee.departmentName === deptFilter)
  }
  if (storeFilter !== "Semua") {
    filteredLogs = filteredLogs.filter(l => l.employee.store?.name === storeFilter)
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage))
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const presentCount = initialData.logs.filter((l) => l.displayStatus === "PRESENT" || l.displayStatus === "LATE").length
  const missingCount = initialData.logs.filter((l) => l.displayStatus === "BELUM_ABSEN").length
  const leaveCount = initialData.logs.filter((l) => l.displayStatus === "ON_LEAVE").length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Log Absensi Karyawan</h1>
          <p className="text-sm text-muted-foreground">Pantau status kehadiran seluruh karyawan.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Popover>
            <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal bg-input",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(new Date(date), "PPP", { locale: id }) : <span>Pilih Tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={new Date(date)}
              onSelect={(d) => d && handleDateChange(format(d, "yyyy-MM-dd"))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button 
          variant="outline" 
          className="gap-1.5 w-full sm:w-auto bg-input"
          disabled={isPending}
          onClick={() => {
            NProgress.start()
            startTransition(() => {
              router.push('/hrd/rekap')
            })
          }}
        >
          <Download className="h-4 w-4" />
          Export Rekap
        </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Hadir", value: presentCount, color: "text-success" },
          { label: "Belum Absen", value: missingCount, color: "text-destructive" },
          { label: "Izin/Cuti", value: leaveCount, color: "text-secondary" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter tabs & Dropdowns */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setCurrentPage(1); }}>
            <TabsList className="w-max">
              {TAB_FILTERS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex gap-2">
          <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] bg-input text-xs h-9">
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Dept</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] bg-input text-xs h-9">
              <SelectValue placeholder="Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Toko</SelectItem>
              {stores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee list */}
      {filteredLogs.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">Tidak ada data untuk filter ini.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {paginatedLogs.map((entry: LogEntry) => {
            const { employee, attendance, displayStatus } = entry
            return (
              <GlassCard key={employee.id} className="flex items-center gap-3 p-3">
                {/* Avatar */}
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt={employee.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">
                    {getInitials(employee.name)}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{employee.shift?.name ?? "—"}</span>
                    {employee.store && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {employee.store.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Check-in / Check-out */}
                <div className="hidden text-center sm:flex flex-col items-center shrink-0 w-16">
                  <p className="text-[10px] text-muted-foreground mb-1">Masuk</p>
                  {attendance?.checkInPhotoUrl ? (
                    <img src={attendance.checkInPhotoUrl} alt="In" className="h-8 w-8 rounded-full object-cover border" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center">
                      <UserX className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-foreground mt-1">{formatTime(attendance?.checkInTime)}</p>
                </div>
                <div className="hidden text-center sm:flex flex-col items-center shrink-0 w-16">
                  <p className="text-[10px] text-muted-foreground mb-1">Pulang</p>
                  {attendance?.checkOutPhotoUrl ? (
                    <img src={attendance.checkOutPhotoUrl} alt="Out" className="h-8 w-8 rounded-full object-cover border" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center">
                      <UserX className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-foreground mt-1">{formatTime(attendance?.checkOutTime)}</p>
                </div>

                {/* Status badge and Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block">
                    <StatusBadge status={displayStatus as DisplayStatus} />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedLog(entry)
                      setModalOpen(true)
                    }}
                    className="h-8 w-8 p-0"
                    title="Lihat Detail"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm py-2">
          <span className="text-muted-foreground">Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(filteredLogs.length, currentPage * itemsPerPage)} dari {filteredLogs.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open)
        if (!open) { setSelectedLog(null); setOverrideReason(""); setOverrideStatus("PRESENT"); }
      }}>
        <DialogContent className="max-w-md w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Absensi</DialogTitle>
            <DialogDescription>
              {selectedLog?.employee.name} - {selectedLog?.employee.shift?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Check-In Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Check-In</h4>
                {selectedLog.attendance?.checkInTime ? (
                  <div className="rounded-lg border bg-muted/20 p-3 flex gap-4 items-start">
                    {selectedLog.attendance.checkInPhotoUrl ? (
                      <img src={selectedLog.attendance.checkInPhotoUrl} alt="Check-in" className="h-20 w-16 object-cover rounded bg-muted" />
                    ) : (
                      <div className="h-20 w-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground text-center p-1">No Photo</div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{formatTime(selectedLog.attendance.checkInTime)}</p>
                      {selectedLog.attendance.checkInLat && selectedLog.attendance.checkInLng && (
                        <a 
                          href={`https://maps.google.com/?q=${selectedLog.attendance.checkInLat},${selectedLog.attendance.checkInLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                          <Map className="h-3 w-3" />
                          Lihat di Peta
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Belum Check-In</p>
                )}
              </div>

              
              {/* Override / Dispensasi Section — available even with no record on past dates */}
              {(selectedLog.attendance || (selectedLog as any).isPastDate) && !(selectedLog as any).isOffDay && (
                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm">Ubah Status (Dispensasi)</h4>
                    {selectedLog.attendance?.isOverridden && (
                      <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">TER-OVERRIDE</span>
                    )}
                  </div>

                  {!selectedLog.attendance && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-md p-2.5 text-xs text-destructive mb-3">
                      Karyawan ini tidak memiliki catatan absensi pada tanggal ini. Mengubah status akan membuat catatan baru secara manual.
                    </div>
                  )}
                  
                  {selectedLog.attendance?.isOverridden && selectedLog.attendance?.overrideReason && (
                    <div className="bg-muted p-2 rounded-md text-xs mb-3 border border-border">
                      <span className="font-bold">Alasan Override Sebelumnya: </span> 
                      {selectedLog.attendance.overrideReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Status Baru</label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value as DisplayStatus)}
                      >
                        <option value="PRESENT">Hadir (Tepat Waktu)</option>
                        <option value="LATE">Telat</option>
                        <option value="ALPHA">Alpha</option>
                        <option value="ON_LEAVE">Izin/Cuti</option>
                        <option value="TIDAK_ABSEN">Tidak Absen (Mangkir)</option>
                        <option value="FORGOT_CHECKIN">Lupa Check-in</option>
                        <option value="FORGOT_CHECKOUT">Lupa Check-out</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Alasan (Wajib)</label>
                      <Input 
                        placeholder="Contoh: Sakit mendadak, lupa absen..." 
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    onClick={handleOverride} 
                    disabled={isOverriding || !overrideReason.trim()}
                  >
                    {isOverriding ? "Menyimpan..." : "Simpan Perubahan Status"}
                  </Button>
                </div>
              )}

{/* Check-Out Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Check-Out</h4>
                {selectedLog.attendance?.checkOutTime ? (
                  <div className="rounded-lg border bg-muted/20 p-3 flex gap-4 items-start">
                    {selectedLog.attendance.checkOutPhotoUrl ? (
                      <img src={selectedLog.attendance.checkOutPhotoUrl} alt="Check-out" className="h-20 w-16 object-cover rounded bg-muted" />
                    ) : (
                      <div className="h-20 w-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground text-center p-1">No Photo</div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{formatTime(selectedLog.attendance.checkOutTime)}</p>
                      {selectedLog.attendance.checkOutLat && selectedLog.attendance.checkOutLng && (
                        <a 
                          href={`https://maps.google.com/?q=${selectedLog.attendance.checkOutLat},${selectedLog.attendance.checkOutLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                          <Map className="h-3 w-3" />
                          Lihat di Peta
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Belum Check-Out</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
