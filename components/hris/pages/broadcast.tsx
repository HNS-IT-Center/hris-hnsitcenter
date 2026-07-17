"use client"

import { useState, useTransition, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import {
  Send,
  Clock,
  Users,
  Megaphone,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Timer,
  Building2,
  Store,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Bell,
} from "lucide-react"
import { createBroadcast, type BroadcastWithFilters } from "@/app/actions/broadcast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Department = { id: string; name: string }
type Store = { id: string; name: string }
type Shift = { id: string; name: string }
type UserOption = { id: string; name: string; departmentName: string | null; positionName: string | null }

interface BroadcastPageProps {
  departments: Department[]
  stores: Store[]
  shifts: Shift[]
  users: UserOption[]
  broadcasts: BroadcastWithFilters[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAGS = [
  {
    id: "NOTICE" as const,
    label: "Notice",
    desc: "Pengumuman biasa",
    icon: Bell,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-muted-foreground/30",
    activeBorder: "border-primary",
    activeBg: "bg-primary/5",
  },
  {
    id: "EVENT" as const,
    label: "Event",
    desc: "Kegiatan / acara",
    icon: CalendarClock,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-500/10",
  },
  {
    id: "URGENT" as const,
    label: "Urgent",
    desc: "Mendesak / penting",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    activeBorder: "border-destructive",
    activeBg: "bg-destructive/10",
  },
]

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  NOTICE: { label: "Notice", color: "text-muted-foreground", bg: "bg-muted", icon: Bell },
  EVENT:  { label: "Event",  color: "text-blue-500",         bg: "bg-blue-500/10",     icon: CalendarClock },
  URGENT: { label: "Urgent", color: "text-destructive",      bg: "bg-destructive/10",  icon: AlertTriangle },
}

// ─── Broadcast Form ───────────────────────────────────────────────────────────

export function BroadcastPage({ departments, stores, shifts, users, broadcasts: initialBroadcasts }: BroadcastPageProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [tag, setTag] = useState<"NOTICE" | "EVENT" | "URGENT">("NOTICE")
  const [allEmployees, setAllEmployees] = useState(true)

  // Filter selections
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState("")

  // Schedule
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>()
  const [scheduleTime, setScheduleTime] = useState("09:00")

  // Logs collapse
  const [logsExpanded, setLogsExpanded] = useState(true)

  const [isPending, startTransition] = useTransition()

  const filteredUsers = useMemo(
    () => users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())),
    [users, userSearch]
  )

  const toggleId = (ids: string[], setIds: (v: string[]) => void, id: string) => {
    setIds(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  const handleSubmit = () => {
    if (!title.trim()) return toast.error("Judul tidak boleh kosong.")
    if (!message.trim()) return toast.error("Pesan tidak boleh kosong.")
    if (!allEmployees && selectedDeptIds.length === 0 && selectedStoreIds.length === 0 && selectedShiftIds.length === 0 && selectedUserIds.length === 0) {
      return toast.error("Pilih minimal satu penerima.")
    }

    let scheduledAt: Date | null = null
    if (isScheduled) {
      if (!scheduleDate) return toast.error("Pilih tanggal kirim.")
      const [h, m] = scheduleTime.split(":").map(Number)
      const dt = new Date(scheduleDate)
      dt.setHours(h, m, 0, 0)
      if (dt <= new Date()) return toast.error("Waktu kirim harus di masa depan.")
      scheduledAt = dt
    }

    startTransition(async () => {
      const res = await createBroadcast({
        title: title.trim(),
        message: message.trim(),
        tag,
        scheduledAt,
        allEmployees,
        departmentIds: selectedDeptIds,
        storeIds: selectedStoreIds,
        shiftIds: selectedShiftIds,
        userIds: selectedUserIds,
      })

      if (res.success) {
        toast.success(
          isScheduled ? "Broadcast dijadwalkan" : "Broadcast terkirim",
          { description: isScheduled ? `Akan dikirim pada ${scheduleDate ? format(scheduleDate, "dd MMM yyyy", { locale: localeID }) : ""} pukul ${scheduleTime}.` : "Pengumuman telah dikirim ke penerima." }
        )
        // Reset form
        setTitle("")
        setMessage("")
        setTag("NOTICE")
        setAllEmployees(true)
        setSelectedDeptIds([])
        setSelectedStoreIds([])
        setSelectedShiftIds([])
        setSelectedUserIds([])
        setIsScheduled(false)
        setScheduleDate(undefined)
        setScheduleTime("09:00")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Broadcast Pengumuman" desc="Kirim pengumuman ke karyawan terpilih." />

      {/* Two-column layout on desktop */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* ── Form (3/5) ── */}
        <div className="space-y-5 xl:col-span-3">
          <GlassCard className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="bc-title">Judul</Label>
              <Input id="bc-title" placeholder="Judul pengumuman" className="bg-input" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bc-message">Pesan</Label>
                <span className="text-xs text-muted-foreground">{message.length}/500</span>
              </div>
              <Textarea
                id="bc-message"
                maxLength={500}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tulis isi pengumuman..."
                className="min-h-28 bg-input"
              />
            </div>

            {/* Tag */}
            <div className="space-y-2">
              <Label>Tag</Label>
              <RadioGroup value={tag} onValueChange={v => setTag(v as any)} className="flex flex-wrap gap-3">
                {TAGS.map(t => {
                  const Icon = t.icon
                  const isActive = tag === t.id
                  return (
                    <Label
                      key={t.id}
                      htmlFor={`tag-${t.id}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all",
                        isActive
                          ? `${t.activeBorder} ${t.activeBg} ring-1 ring-current`
                          : `border-border hover:${t.activeBorder}`
                      )}
                    >
                      <RadioGroupItem id={`tag-${t.id}`} value={t.id} className="sr-only" />
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", t.bg)}>
                        <Icon className={cn("h-4 w-4", t.color)} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", isActive ? t.color : "text-foreground")}>{t.label}</p>
                        <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </Label>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <Label>Penerima</Label>

              <Label htmlFor="all-emp" className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all",
                allEmployees ? "border-primary bg-primary/5" : "border-border"
              )}>
                <Checkbox id="all-emp" checked={allEmployees} onCheckedChange={v => setAllEmployees(!!v)} />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Semua Karyawan</span>
                </div>
              </Label>

              {!allEmployees && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  {/* Department */}
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Building2 className="h-3.5 w-3.5" /> Departemen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {departments.map(d => (
                        <button
                          key={d.id}
                          onClick={() => toggleId(selectedDeptIds, setSelectedDeptIds, d.id)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                            selectedDeptIds.includes(d.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Store */}
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Store className="h-3.5 w-3.5" /> Toko
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stores.map(s => (
                        <button
                          key={s.id}
                          onClick={() => toggleId(selectedStoreIds, setSelectedStoreIds, s.id)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                            selectedStoreIds.includes(s.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shift */}
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Clock className="h-3.5 w-3.5" /> Shift
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {shifts.map(s => (
                        <button
                          key={s.id}
                          onClick={() => toggleId(selectedShiftIds, setSelectedShiftIds, s.id)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                            selectedShiftIds.includes(s.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Individual users */}
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Users className="h-3.5 w-3.5" /> Karyawan Tertentu
                    </p>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama karyawan..."
                        className="h-8 bg-input pl-8 text-sm"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
                      {filteredUsers.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">Tidak ditemukan</p>
                      ) : (
                        filteredUsers.map(u => (
                          <label key={u.id} className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                            selectedUserIds.includes(u.id) ? "bg-primary/5" : "hover:bg-muted/50"
                          )}>
                            <Checkbox
                              checked={selectedUserIds.includes(u.id)}
                              onCheckedChange={() => toggleId(selectedUserIds, setSelectedUserIds, u.id)}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.positionName ?? u.departmentName ?? ""}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <p className="mt-1.5 text-xs text-primary font-medium">{selectedUserIds.length} karyawan dipilih</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <Label htmlFor="schedule-toggle" className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Jadwalkan Pengiriman</span>
                </div>
                <Checkbox id="schedule-toggle" checked={isScheduled} onCheckedChange={v => setIsScheduled(!!v)} />
              </Label>

              {isScheduled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Kirim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-input text-sm h-9", !scheduleDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "dd MMM yyyy", { locale: localeID }) : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={d => d < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Jam Kirim (WIB)</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="h-9 bg-input text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Mengirim...</>
              ) : isScheduled ? (
                <><CalendarClock className="h-4 w-4" /> Jadwalkan Broadcast</>
              ) : (
                <><Send className="h-4 w-4" /> Kirim Broadcast Sekarang</>
              )}
            </Button>
          </GlassCard>
        </div>

        {/* ── Broadcast Logs (2/5) ── */}
        <div className="xl:col-span-2">
          <GlassCard className="space-y-4">
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => setLogsExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Log Broadcast</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {initialBroadcasts.length}
                </span>
              </div>
              {logsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>

            {logsExpanded && (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {initialBroadcasts.length === 0 ? (
                  <div className="py-10 text-center">
                    <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Belum ada broadcast.</p>
                  </div>
                ) : (
                  initialBroadcasts.map(b => {
                    const tagCfg = TAG_CONFIG[b.tag] ?? TAG_CONFIG.NOTICE
                    const TagIcon = tagCfg.icon
                    const scheduledTime = b.scheduledAt
                      ? format(new Date(b.scheduledAt), "dd MMM yyyy HH:mm", { locale: localeID })
                      : null
                    const sentTime = b.sentAt
                      ? format(new Date(b.sentAt), "dd MMM yyyy HH:mm", { locale: localeID })
                      : null

                    // Determine recipient summary
                    const hasDepts = b.filterDepts.length > 0
                    const hasStores = b.filterStores.length > 0
                    const hasShifts = b.filterShifts.length > 0
                    const hasUsers = b.filterUsers.length > 0
                    const hasAnyFilter = hasDepts || hasStores || hasShifts || hasUsers
                    const recipientSummary = !hasAnyFilter
                      ? "Semua karyawan"
                      : [
                          hasDepts && `${b.filterDepts.length} dept`,
                          hasStores && `${b.filterStores.length} toko`,
                          hasShifts && `${b.filterShifts.length} shift`,
                          hasUsers && `${b.filterUsers.length} individu`,
                        ].filter(Boolean).join(", ")

                    return (
                      <div key={b.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", tagCfg.bg)}>
                              <TagIcon className={cn("h-3.5 w-3.5", tagCfg.color)} />
                            </div>
                            <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
                          </div>
                          {/* Sent/Scheduled badge */}
                          <span className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            b.isSent ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"
                          )}>
                            {b.isSent ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {b.isSent ? "Terkirim" : "Terjadwal"}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{b.message}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {recipientSummary}
                          </span>
                          {b.isSent && sentTime && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {sentTime}
                            </span>
                          )}
                          {!b.isSent && scheduledTime && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3 text-yellow-500" /> {scheduledTime}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            oleh {b.createdBy.name}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
