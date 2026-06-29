"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/hris/shared"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Briefcase, CalendarDays, ChevronRight, Download, MapPin, Search, CalendarIcon, Upload, Lock } from "lucide-react"
import { format, addDays } from "date-fns"
import { id } from "date-fns/locale"
import { type DateRange } from "react-day-picker"

import { updateEmployee } from "@/app/actions/employee"
import { compressToWebP } from "@/lib/utils/file"
import { DatePickerWithRange } from "@/components/hris/shared/date-range-picker"

type User = any
type Store = any
type Shift = any

const WEEKDAYS = [
  { id: 1, label: "Senin" },
  { id: 2, label: "Selasa" },
  { id: 3, label: "Rabu" },
  { id: 4, label: "Kamis" },
  { id: 5, label: "Jumat" },
  { id: 6, label: "Sabtu" },
  { id: 0, label: "Minggu" },
]

const SHIFT_PATTERNS = [
  { id: "MORNING_ONLY", label: "Shift Tetap (Pilih 1 Shift)" },
  { id: "WEEKLY_ALTERNATING", label: "Rotasi Mingguan (Shift 1 & 2)" },
]

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        active
          ? "border-success/30 bg-success/15 text-success"
          : "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  )
}

export function EmployeesPage({ initialEmployees, stores, shifts }: { initialEmployees: User[], stores: Store[], shifts: Shift[] }) {
  const [q, setQ] = useState("")
  const [deptFilter, setDeptFilter] = useState("Semua")
  const [storeFilter, setStoreFilter] = useState("Semua")
  
  const [employees, setEmployees] = useState<User[]>(initialEmployees)
  const [selected, setSelected] = useState<User | null>(null)
  const [draft, setDraft] = useState<any | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  })

  // Unique departments for filter
  const departments = Array.from(new Set(employees.map(e => e.departmentName).filter(Boolean))) as string[]

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) &&
      (deptFilter === "Semua" || e.departmentName === deptFilter) &&
      (storeFilter === "Semua" || e.storeId === storeFilter),
  )

  function openDetail(e: User) {
    setSelected(e)
    setDraft({ 
      ...e,
      joinDate: new Date(e.joinDate),
      weeklyOffDays: e.weeklyOffDays || [],
    })
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !draft) return
    
    setIsUploading(true)
    try {
      const compressed = await compressToWebP(file, 0.90)
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('userId', draft.id)
      
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (res.ok && data.url) {
        setDraft({ ...draft, avatarUrl: data.url })
        toast.success("Foto profil berhasil diunggah")
      } else {
        toast.error("Gagal mengunggah foto profil", { description: data.error })
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunggah foto")
    } finally {
      setIsUploading(false)
    }
  }

  async function save() {
    if (!draft) return
    const promise = updateEmployee(draft.id, {
      joinDate: draft.joinDate,
      weeklyOffDays: draft.weeklyOffDays,
      shiftPattern: draft.shiftPattern,
      storeId: draft.storeId,
      shiftId: draft.shiftId,
      secondaryShiftId: draft.shiftPattern === 'WEEKLY_ALTERNATING' ? draft.secondaryShiftId : null,
      isActive: draft.isActive,
      avatarUrl: draft.avatarUrl,
    })

    toast.promise(promise, {
      loading: 'Menyimpan perubahan...',
      success: (res) => {
        if (res.success) {
          setEmployees(prev => prev.map(e => e.id === draft.id ? { ...e, ...draft } : e))
          setSelected(null)
          return `Data ${draft.name} diperbarui`
        } else {
          throw new Error(res.error)
        }
      },
      error: (err) => err.message
    })
  }

  function toggleOffDay(dayId: number) {
    if (!draft) return
    const current = draft.weeklyOffDays as number[]
    if (current.includes(dayId)) {
      setDraft({ ...draft, weeklyOffDays: current.filter(d => d !== dayId) })
    } else {
      setDraft({ ...draft, weeklyOffDays: [...current, dayId] })
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <GlassCard className="flex flex-col gap-3 lg:flex-row lg:items-center overflow-hidden w-full break-words">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari karyawan..." className="pl-9 bg-input" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full bg-input sm:w-40">
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Dept</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full bg-input sm:w-44">
              <SelectValue placeholder="Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Toko</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1.5 w-full sm:w-auto">
                <Download className="h-4 w-4" />
                Export Rekap
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Export Rekap Absensi</h4>
                <p className="text-sm text-muted-foreground">Pilih rentang tanggal untuk diexport.</p>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" className="w-full" onClick={() => toast.success("Mengekspor PDF...")}>Export PDF</Button>
                  <Button variant="outline" className="w-full" onClick={() => toast.success("Mengekspor Excel...")}>Export XLS</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </GlassCard>

      {/* Mobile: cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((e) => (
          <GlassCard key={e.id} className="p-4 w-full overflow-hidden break-words">
            <button onClick={() => openDetail(e)} className="flex w-full items-center gap-3 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary overflow-hidden">
                {e.avatarUrl ? <img src={e.avatarUrl} alt={e.name} className="h-full w-full object-cover" /> : e.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-foreground">{e.name}</p>
                  <StatusBadge active={e.isActive} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {e.positionName} • {e.ssoId || e.id}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {e.departmentName || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {stores.find(s => s.id === e.storeId)?.name || 'Pusat'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <GlassCard className="py-10 text-center text-sm text-muted-foreground w-full">
            Tidak ada karyawan yang cocok dengan filter.
          </GlassCard>
        )}
      </div>

      {/* Desktop: table */}
      <GlassCard className="hidden overflow-hidden p-0 lg:block w-full">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail(e)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary overflow-hidden shrink-0">
                        {e.avatarUrl ? <img src={e.avatarUrl} alt={e.name} className="h-full w-full object-cover" /> : e.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[200px]">{e.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{e.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.departmentName || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.positionName || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{stores.find(s => s.id === e.storeId)?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(e.joinDate), 'dd MMM yyyy', { locale: id })}</TableCell>
                  <TableCell>
                    <StatusBadge active={e.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada karyawan yang cocok dengan filter.</p>
        )}
      </GlassCard>

      {/* Detail / Edit dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl w-[95vw] sm:w-full">
          {draft && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-xl font-semibold text-secondary overflow-hidden relative shrink-0">
                      {draft.avatarUrl ? <img src={draft.avatarUrl} alt={draft.name} className="h-full w-full object-cover" /> : draft.name.charAt(0)}
                      <div className="absolute inset-0 bg-black/40 items-center justify-center flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                  </div>
                  <div>
                    <DialogTitle>{draft.name}</DialogTitle>
                    <DialogDescription>
                      Edit profil dan jadwal karyawan
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Posisi (Dari SSO)</Label>
                    <Input value={draft.positionName || '-'} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Departemen (Dari SSO)</Label>
                    <Input value={draft.departmentName || '-'} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tanggal Bergabung</Label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-between text-left font-normal bg-input text-foreground",
                            !draft.joinDate && "text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {draft.joinDate ? format(draft.joinDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </div>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ubah Tanggal Bergabung?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Mengubah tanggal bergabung karyawan ini berpotensi me-reset dan menghitung ulang periode kuota cuti tahunannya. Apakah Anda yakin ingin melanjutkannya?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-center p-4">
                          <Calendar
                            mode="single"
                            selected={draft.joinDate}
                            onSelect={(d) => d && setDraft({ ...draft, joinDate: d })}
                            initialFocus
                            className="rounded-md border"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Selesai</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status Karyawan</Label>
                    <Select
                      value={draft.isActive ? "active" : "inactive"}
                      onValueChange={(v) => setDraft({ ...draft, isActive: v === "active" })}
                    >
                      <SelectTrigger className="w-full bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="h-px bg-border my-2" />
                <h4 className="text-sm font-medium text-foreground">Pengaturan Jadwal & Lokasi</h4>

                <div className="space-y-1.5">
                  <Label>Lokasi Toko/Cabang</Label>
                  <Select value={draft.storeId || "none"} onValueChange={(v) => setDraft({ ...draft, storeId: v === "none" ? null : v })}>
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue placeholder="Pilih lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pusat / Tidak Ada</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
                  <div className="space-y-1.5">
                    <Label>Pola Rotasi Shift</Label>
                    <Select value={draft.shiftPattern || "none"} onValueChange={(v) => setDraft({ ...draft, shiftPattern: v === "none" ? null : v })}>
                      <SelectTrigger className="w-full bg-input">
                        <SelectValue placeholder="Pilih pola" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Manual / Tidak Ada</SelectItem>
                        {SHIFT_PATTERNS.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {draft.shiftPattern === "MORNING_ONLY" && (
                    <div className="space-y-1.5 pt-2">
                      <Label>Pilih Shift</Label>
                      <Select value={draft.shiftId || "none"} onValueChange={(v) => setDraft({ ...draft, shiftId: v === "none" ? null : v })}>
                        <SelectTrigger className="w-full bg-input">
                          <SelectValue placeholder="Pilih shift utama" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Belum Ditentukan</SelectItem>
                          {shifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.startTime}-{s.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {draft.shiftPattern === "WEEKLY_ALTERNATING" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border mt-2">
                      <div className="space-y-1.5">
                        <Label>Shift 1 (Minggu Ganjil)</Label>
                        <Select value={draft.shiftId || "none"} onValueChange={(v) => setDraft({ ...draft, shiftId: v === "none" ? null : v })}>
                          <SelectTrigger className="w-full bg-input">
                            <SelectValue placeholder="Pilih shift pertama" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Belum Ditentukan</SelectItem>
                            {shifts.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.startTime}-{s.endTime})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shift 2 (Minggu Genap)</Label>
                        <Select value={draft.secondaryShiftId || "none"} onValueChange={(v) => setDraft({ ...draft, secondaryShiftId: v === "none" ? null : v })}>
                          <SelectTrigger className="w-full bg-input">
                            <SelectValue placeholder="Pilih shift kedua" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Belum Ditentukan</SelectItem>
                            {shifts.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.startTime}-{s.endTime})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Hari Libur Rutin (Weekly Off)</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.id}`}
                          checked={draft.weeklyOffDays.includes(day.id)}
                          onCheckedChange={() => toggleOffDay(day.id)}
                        />
                        <label
                          htmlFor={`day-${day.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Pilih hari dimana karyawan ini libur secara rutin. Jika rotasi shift memiliki libur yang berubah-ubah, biarkan kosong dan atur dari Kalender Shift.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Batal
                </Button>
                <Button onClick={save} disabled={isUploading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {isUploading ? "Mengunggah..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
