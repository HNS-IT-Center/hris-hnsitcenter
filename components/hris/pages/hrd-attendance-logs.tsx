"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GlassCard } from "@/components/hris/shared"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  LogOut,
  MapPin,
  UserX,
} from "lucide-react"
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
        <Input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-auto bg-input sm:w-48"
        />
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
                <div className="hidden text-center sm:block shrink-0">
                  <p className="text-xs text-muted-foreground">Masuk</p>
                  <p className="text-sm font-medium text-foreground">{formatTime(attendance?.checkInTime)}</p>
                </div>
                <div className="hidden text-center sm:block shrink-0">
                  <p className="text-xs text-muted-foreground">Pulang</p>
                  <p className="text-sm font-medium text-foreground">{formatTime(attendance?.checkOutTime)}</p>
                </div>

                {/* Status badge */}
                <div className="shrink-0">
                  <StatusBadge status={displayStatus as DisplayStatus} />
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
