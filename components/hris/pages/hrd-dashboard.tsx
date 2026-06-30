"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Clock,
  Users,
  UserMinus,
  CalendarDays,
  CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { getHrdDashboardData } from "@/app/actions/dashboard"
import { resolveAttentionFlag } from "@/app/actions/flags"

type HrdData = Awaited<ReturnType<typeof getHrdDashboardData>>

export function HrdDashboard({ data }: { data: HrdData }) {
  const router = useRouter()
  const { totalActive, present, late, missing, pendingLeaveCount, unresolvedFlags, selectedDate } = data
  const dateObj = selectedDate ? new Date(selectedDate) : new Date()

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "yyyy-MM-dd")
      router.push(`/hrd/dashboard?date=${formatted}`)
    }
  }

  const STATS = [
    { label: "Karyawan Aktif", value: totalActive, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Hadir", value: present, icon: CalendarCheck, color: "text-success", bg: "bg-success/10" },
    { label: "Telat", value: late, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Tidak Hadir", value: missing, icon: UserMinus, color: "text-destructive", bg: "bg-destructive/10" },
  ]

  const QUICK = [
    { label: "Izin & Cuti", value: pendingLeaveCount, icon: ClipboardList, path: "/hrd/leave" },
    { label: "Log Absensi Hari Ini", value: null, icon: CalendarDays, path: "/hrd/attendance" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard HRD
        </h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateObj && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateObj ? format(dateObj, "PPP", { locale: id }) : <span>Pilih Tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.bg)}>
                <Icon className={cn("h-5 w-5", s.color)} />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attention flags */}
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-semibold text-foreground">Perlu Diperhatikan</h2>
          </div>
          <div className="space-y-3">
            {unresolvedFlags.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Tidak ada flag yang perlu diperhatikan.</p>
            ) : (
              unresolvedFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{flag.user.name}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={async () => {
                      await resolveAttentionFlag(flag.id)
                      toast.success("Flag diselesaikan")
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Quick links */}
        <GlassCard>
          <h2 className="mb-4 font-semibold text-foreground">Aksi Cepat</h2>
          <div className="space-y-3">
            {QUICK.map((q) => {
              const Icon = q.icon
              return (
                <button
                  key={q.label}
                  onClick={() => router.push(q.path)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{q.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {q.value !== null && q.value > 0 && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                        {q.value}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
