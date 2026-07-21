"use client"

import { useState } from "react"
import { GlassCard } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import { AlarmClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plane, XCircle, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-success",
  LATE: "bg-warning",
  ALPHA: "bg-destructive",
  ON_LEAVE: "bg-secondary",
  HOLIDAY: "bg-primary",
  FORGOT_CHECKIN: "bg-destructive/60",
  FORGOT_CHECKOUT: "bg-warning/60",
}

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Hadir",
  LATE: "Telat",
  ALPHA: "Alpha",
  ON_LEAVE: "Izin/Cuti",
  HOLIDAY: "Libur",
  FORGOT_CHECKIN: "Lupa Check-in",
  FORGOT_CHECKOUT: "Lupa Check-out",
}

type AttendanceRecord = {
  date: Date | string
  status: string
  lateMinutes: number
}

export function PerformancePage({
  attendanceRecords,
  events = [],
  year,
  month,
  summary,
  periodLabel,
}: {
  attendanceRecords: AttendanceRecord[]
  events?: any[]
  year: number
  month: number // 1-indexed
  summary?: { hadir: number, telat: number, alpha: number, izin: number, cuti: number }
  periodLabel?: string
  weeklyOffDays?: number[]
}) {
  const router = useRouter()

  // Build a map of day -> status for O(1) lookup
  const statusByDay = new Map<number, string>()
  for (const r of attendanceRecords) {
    const d = new Date(r.date)
    statusByDay.set(d.getUTCDate(), r.status)
  }

  const eventsByDay = new Map<number, any[]>()
  for (const e of events) {
    const d = new Date(e.date)
    const day = d.getUTCDate()
    if (!eventsByDay.has(day)) eventsByDay.set(day, [])
    eventsByDay.get(day)!.push(e)
  }

  const [selectedEvents, setSelectedEvents] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  // Month display info
  const monthDate = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // Day of week (Mon=1 .. Sun=0 → shift so Mon=0)
  const firstDayRaw = monthDate.getDay() // 0=Sun
  const firstDayOffset = (firstDayRaw + 6) % 7 // Mon-based offset

  const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

  // Summary tallies passed from server
  const activeSummary = summary || { hadir: 0, telat: 0, alpha: 0, izin: 0, cuti: 0 }

  const SUMMARY = [
    { label: "Hadir", value: activeSummary.hadir, icon: CheckCircle2, color: "text-success" },
    { label: "Telat", value: activeSummary.telat, icon: AlarmClock, color: "text-warning" },
    { label: "Alpha", value: activeSummary.alpha, icon: XCircle, color: "text-destructive" },
    { label: "Izin", value: activeSummary.izin, icon: Clock, color: "text-secondary" },
    { label: "Cuti", value: activeSummary.cuti, icon: Plane, color: "text-primary" },
  ]

  const navigateMonth = (dir: -1 | 1) => {
    const d = new Date(year, month - 1 + dir, 1)
    const params = new URLSearchParams({
      year: String(d.getFullYear()),
      month: String(d.getMonth() + 1),
    })
    router.push(`/performance?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">{MONTH_NAMES[month - 1]} {year}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {/* Padding cells for first day offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            let status = statusByDay.get(day)
            const dayEvents = eventsByDay.get(day) || []

            // If there's an ON_LEAVE event and no attendance record, show the day as ON_LEAVE
            if (!status && dayEvents.some(e => e.type === 'ON_LEAVE')) {
              status = 'ON_LEAVE'
            }

            const rawDate = new Date(Date.UTC(year, month - 1, day))
            const isOffDay = weeklyOffDays?.includes(rawDate.getUTCDay())
            const today = new Date()
            const isToday = rawDate.getUTCFullYear() === today.getFullYear() && 
                            rawDate.getUTCMonth() === today.getMonth() && 
                            rawDate.getUTCDate() === today.getDate()

            return (
              <button
                key={day}
                title={status ? STATUS_LABEL[status] : undefined}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedEvents(dayEvents)
                    setModalOpen(true)
                  }
                }}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm text-foreground transition-colors",
                  isToday ? "border-emerald-500/50 bg-emerald-500/10" : (isOffDay ? "border-destructive/20 bg-destructive/10" : "border-border bg-card/40"),
                  (!isToday && !isOffDay && dayEvents.length > 0) && "hover:bg-muted/60 cursor-pointer",
                  dayEvents.length === 0 && "cursor-default"
                )}
              >
                <span>{day}</span>
                <div className="flex gap-1">
                  {status && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[status] ?? "bg-muted")} />}
                  {dayEvents.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-full", STATUS_COLORS[key])} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Event/Acara
          </span>
        </div>
      </GlassCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Acara</DialogTitle>
            <DialogDescription>Acara yang berlangsung pada tanggal tersebut.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEvents.map((ev) => (
              <div key={ev.id} className="rounded-lg border bg-muted/40 p-3">
                <h4 className="font-semibold">{ev.title}</h4>
                {ev.note && <p className="mt-1 text-sm text-muted-foreground">{ev.note}</p>}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Tipe: {ev.type}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {periodLabel || "Rekap Performa"}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SUMMARY.map((s) => {
            const Icon = s.icon
            return (
              <GlassCard key={s.label} className="flex items-center gap-3 p-4">
                <Icon className={cn("h-6 w-6 shrink-0", s.color)} />
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
