"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { type DateRange } from "react-day-picker"
import { GlassCard } from "@/components/hris/shared"
import { DatePickerWithRange } from "@/components/hris/shared/date-range-picker"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id } from "date-fns/locale"
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
  Download
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { getHrdAttendanceLogs } from "@/app/actions/dashboard"

type LogData = Awaited<ReturnType<typeof getHrdAttendanceLogs>>
type LogEntry = LogData["logs"][number]

type DisplayStatus = "PRESENT" | "LATE" | "ALPHA" | "ON_LEAVE" | "FORGOT_CHECKOUT" | "BELUM_ABSEN" | "HOLIDAY" | "FORGOT_CHECKIN"

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; icon: React.ElementType }> = {
  PRESENT: { label: "Hadir", color: "text-success bg-success/10", icon: CheckCircle2 },
  LATE: { label: "Telat", color: "text-warning bg-warning/10", icon: Clock },
  ALPHA: { label: "Alpha", color: "text-destructive bg-destructive/10", icon: UserX },
  ON_LEAVE: { label: "Izin/Cuti", color: "text-secondary bg-secondary/10", icon: LogOut },
  FORGOT_CHECKOUT: { label: "Lupa Check-out", color: "text-warning bg-warning/10", icon: LogOut },
  FORGOT_CHECKIN: { label: "Lupa Check-in", color: "text-destructive bg-destructive/10", icon: UserX },
  BELUM_ABSEN: { label: "Belum Absen", color: "text-muted-foreground bg-muted", icon: HelpCircle },
  HOLIDAY: { label: "Libur", color: "text-primary bg-primary/10", icon: CheckCircle2 },
}

const TAB_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "PRESENT", label: "Hadir" },
  { value: "LATE", label: "Telat" },
  { value: "BELUM_ABSEN", label: "Belum Absen" },
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
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState("all")
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>()
  const [date, setDate] = useState(() => {
    const d = new Date(initialData.date)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  })

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    startTransition(() => {
      router.push(`/hrd/attendance?date=${newDate}`)
    })
  }

  const filtered = tab === "all"
    ? initialData.logs
    : initialData.logs.filter((l) => l.displayStatus === tab)

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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-1.5 w-full sm:w-auto bg-input">
              <Download className="h-4 w-4" />
              Export Rekap
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Export Rekap Absensi</h4>
              <p className="text-sm text-muted-foreground">Pilih rentang tanggal untuk diexport.</p>
              <DatePickerWithRange date={exportDateRange} setDate={setExportDateRange} />
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="w-full" onClick={() => toast.success("Mengekspor PDF...")}>Export PDF</Button>
                <Button variant="outline" className="w-full" onClick={() => toast.success("Mengekspor Excel...")}>Export XLS</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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

      {/* Filter tabs */}
      <div className="overflow-x-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-max">
            {TAB_FILTERS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Employee list */}
      {filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">Tidak ada data untuk filter ini.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry: LogEntry) => {
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

      {/* Details Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open)
        if (!open) setSelectedLog(null)
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
