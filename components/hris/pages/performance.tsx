"use client"

import { useState } from "react"
import { GlassCard } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import { AlarmClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plane, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

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
  year,
  month,
}: {
  attendanceRecords: AttendanceRecord[]
  year: number
  month: number // 1-indexed
}) {
  const router = useRouter()

  // Build a map of day -> status for O(1) lookup
  const statusByDay = new Map<number, string>()
  for (const r of attendanceRecords) {
    const d = new Date(r.date)
    statusByDay.set(d.getUTCDate(), r.status)
  }

  // Month display info
  const monthDate = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // Day of week (Mon=1 .. Sun=0 → shift so Mon=0)
  const firstDayRaw = monthDate.getDay() // 0=Sun
  const firstDayOffset = (firstDayRaw + 6) % 7 // Mon-based offset

  const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

  // Summary tallies
  const summary = {
    hadir: attendanceRecords.filter((r) => r.status === "PRESENT").length,
    telat: attendanceRecords.filter((r) => r.status === "LATE").length,
    alpha: attendanceRecords.filter((r) => r.status === "ALPHA").length,
    izin: attendanceRecords.filter((r) => r.status === "ON_LEAVE").length,
    cuti: 0, // distinguished by leave type — placeholder
  }

  const SUMMARY = [
    { label: "Hadir", value: summary.hadir, icon: CheckCircle2, color: "text-success" },
    { label: "Telat", value: summary.telat, icon: AlarmClock, color: "text-warning" },
    { label: "Alpha", value: summary.alpha, icon: XCircle, color: "text-destructive" },
    { label: "Izin", value: summary.izin, icon: Clock, color: "text-secondary" },
    { label: "Cuti", value: summary.cuti, icon: Plane, color: "text-primary" },
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
            const status = statusByDay.get(day)
            return (
              <div
                key={day}
                title={status ? STATUS_LABEL[status] : undefined}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card/40 text-sm text-foreground"
              >
                <span>{day}</span>
                {status && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[status] ?? "bg-muted")} />}
              </div>
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
        </div>
      </GlassCard>

      {/* Summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rekap Performa</h2>
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
