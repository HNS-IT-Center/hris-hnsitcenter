"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import {
  CALENDAR_EVENTS,
  CALENDAR_EVENT_TYPES,
  DEPARTMENTS,
  EMPLOYEES,
  SHIFTS,
  STORES,
  type AudienceScope,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/hris-data"
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, Users, X } from "lucide-react"

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

const SCOPE_OPTIONS: { id: AudienceScope; label: string }[] = [
  { id: "all", label: "Semua Karyawan" },
  { id: "department", label: "Departemen" },
  { id: "shift", label: "Shift" },
  { id: "store", label: "Toko" },
  { id: "individual", label: "Karyawan Tertentu" },
]

function typeMeta(type: CalendarEventType) {
  return CALENDAR_EVENT_TYPES.find((t) => t.id === type)!
}

function scopeLabel(ev: CalendarEvent) {
  if (ev.scope === "all") return "Semua Karyawan"
  const prefix: Record<AudienceScope, string> = {
    all: "Semua",
    department: "Departemen",
    shift: "Shift",
    store: "Toko",
    individual: "Karyawan",
  }
  return `${prefix[ev.scope]}: ${ev.scopeValue ?? "-"}`
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function EmployeeMultiSelect({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (names: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-input font-normal text-muted-foreground hover:bg-input"
          >
            {selected.length > 0 ? `${selected.length} karyawan dipilih` : "Pilih karyawan..."}
            <Users className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari karyawan..." />
            <CommandList>
              <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {EMPLOYEES.map((e) => {
                  const isSel = selected.includes(e.name)
                  return (
                    <CommandItem key={e.id} value={e.name} onSelect={() => toggle(e.name)}>
                      <span
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                          isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </span>
                      <span className="flex-1">{e.name}</span>
                      <span className="text-xs text-muted-foreground">{e.department}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button
                type="button"
                onClick={() => toggle(name)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
                aria-label={`Hapus ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function EventForm({
  initialDate,
  onSave,
}: {
  initialDate?: string
  onSave: (ev: Omit<CalendarEvent, "id">) => void
}) {
  const [date, setDate] = useState(initialDate ?? "")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<CalendarEventType>("event")
  const [scope, setScope] = useState<AudienceScope>("all")
  const [scopeValue, setScopeValue] = useState("")
  const [people, setPeople] = useState<string[]>([])
  const [note, setNote] = useState("")

  const scopeChoices = useMemo(() => {
    switch (scope) {
      case "department":
        return DEPARTMENTS
      case "shift":
        return SHIFTS.map((s) => s.name)
      case "store":
        return STORES.map((s) => s.name)
      default:
        return []
    }
  }, [scope])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-date">Tanggal</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-input" />
        </div>
        <div className="space-y-1.5">
          <Label>Jenis</Label>
          <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_EVENT_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Judul</Label>
        <Input
          id="ev-title"
          placeholder="cth. Town Hall Q3, Hari Hujan, Libur Nasional"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-input"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Audiens</Label>
        <Select
          value={scope}
          onValueChange={(v) => {
            setScope(v as AudienceScope)
            setScopeValue("")
            setPeople([])
          }}
        >
          <SelectTrigger className="w-full bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPE_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scope === "individual" && (
        <div className="space-y-1.5">
          <Label>Pilih Karyawan Tertentu</Label>
          <EmployeeMultiSelect selected={people} onChange={setPeople} />
        </div>
      )}

      {scope !== "all" && scope !== "individual" && (
        <div className="space-y-1.5">
          <Label>Pilih {SCOPE_OPTIONS.find((s) => s.id === scope)?.label}</Label>
          <Select value={scopeValue} onValueChange={setScopeValue}>
            <SelectTrigger className="w-full bg-input">
              <SelectValue placeholder="Pilih..." />
            </SelectTrigger>
            <SelectContent>
              {scopeChoices.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ev-note">Catatan (opsional)</Label>
        <Textarea
          id="ev-note"
          placeholder="Detail tambahan yang akan tampil di kalender karyawan"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-input"
        />
      </div>

      <DialogFooter>
        <Button
          onClick={() => {
            if (!date || !title) {
              toast.error("Lengkapi data", { description: "Tanggal dan judul wajib diisi." })
              return
            }
            if (scope === "individual" && people.length === 0) {
              toast.error("Pilih karyawan", { description: "Pilih minimal satu karyawan." })
              return
            }
            if (scope !== "all" && scope !== "individual" && !scopeValue) {
              toast.error("Pilih audiens", { description: "Tentukan target audiens untuk event ini." })
              return
            }
            const resolvedValue =
              scope === "all" ? undefined : scope === "individual" ? people.join(", ") : scopeValue
            onSave({ date, title, type, scope, scopeValue: resolvedValue, note })
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Simpan Event
        </Button>
      </DialogFooter>
    </div>
  )
}

export function CalendarManagerPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS)
  const [cursor, setCursor] = useState({ year: 2026, month: 6 }) // July 2026
  const [open, setOpen] = useState(false)
  const [presetDate, setPresetDate] = useState<string | undefined>()

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      ;(map[ev.date] ??= []).push(ev)
    }
    return map
  }, [events])

  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => {
          const d = new Date(e.date)
          return d.getFullYear() === cursor.year && d.getMonth() === cursor.month
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, cursor],
  )

  function move(delta: number) {
    setCursor((c) => {
      const m = c.month + delta
      if (m < 0) return { year: c.year - 1, month: 11 }
      if (m > 11) return { year: c.year + 1, month: 0 }
      return { ...c, month: m }
    })
  }

  function addEvent(ev: Omit<CalendarEvent, "id">) {
    setEvents((prev) => [...prev, { ...ev, id: `CE-${Date.now()}` }])
    setOpen(false)
    setPresetDate(undefined)
    toast.success("Event ditambahkan", { description: `${ev.title} • ${ev.date}` })
  }

  function openForDate(date: string) {
    setPresetDate(date)
    setOpen(true)
  }

  function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    toast.success("Event dihapus")
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Kelola Kalender"
        desc="Tandai hari hujan, atur event, dan tentukan siapa yang bisa melihatnya."
        action={
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) setPresetDate(undefined)
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Tambah Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Event Kalender</DialogTitle>
                <DialogDescription>Tetapkan jenis hari dan audiens yang dapat melihatnya.</DialogDescription>
              </DialogHeader>
              <EventForm initialDate={presetDate} onSave={addEvent} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Calendar grid */}
        <GlassCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="aspect-square" />
              const iso = toISO(cursor.year, cursor.month, day)
              const dayEvents = eventsByDate[iso] ?? []
              return (
                <button
                  key={iso}
                  onClick={() => openForDate(iso)}
                  className={cn(
                    "group flex aspect-square flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-muted/60",
                    dayEvents.length > 0 && "bg-muted/40",
                  )}
                >
                  <span className="text-xs font-medium text-foreground">{day}</span>
                  <span className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={cn("h-1.5 w-1.5 rounded-full", typeMeta(ev.type).dot)} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3">
            {CALENDAR_EVENT_TYPES.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
                {t.label}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Month event list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Event Bulan Ini ({monthEvents.length})</h3>
          {monthEvents.length === 0 ? (
            <GlassCard className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada event. Ketuk tanggal untuk menambah.</p>
            </GlassCard>
          ) : (
            monthEvents.map((ev) => {
              const meta = typeMeta(ev.type)
              return (
                <GlassCard key={ev.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.color)}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{ev.date}</span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{ev.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {scopeLabel(ev)}
                      </p>
                      {ev.note && <p className="mt-1 text-xs text-muted-foreground text-pretty">{ev.note}</p>}
                    </div>
                    <button
                      onClick={() => removeEvent(ev.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
