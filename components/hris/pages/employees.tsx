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
import { Briefcase, ChevronRight, Download, MapPin, Search, CalendarIcon, Upload, Lock, Plus, Trash2, Eye, EyeOff, ArrowUpDown, Phone, AlertTriangle } from "lucide-react"
import { format, addDays } from "date-fns"
import { id } from "date-fns/locale"
import { type DateRange } from "react-day-picker"

import { updateEmployee, createEmployee, toggleDeviceBlock } from "@/app/actions/employee"
import { compressToWebP } from "@/lib/utils/file"
import { DatePickerWithRange } from "@/components/hris/shared/date-range-picker"
import { useTransition } from "react"

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

export function EmployeesPage({ initialEmployees, stores, shifts, positions }: { initialEmployees: User[], stores: Store[], shifts: Shift[], positions: string[] }) {
  const [q, setQ] = useState("")
  const [deptFilter, setDeptFilter] = useState("Semua")
  const [storeFilter, setStoreFilter] = useState("Semua")
  
  const [employees, setEmployees] = useState<User[]>(initialEmployees)
  const [selected, setSelected] = useState<User | null>(null)
  const [draft, setDraft] = useState<any | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hideInactive, setHideInactive] = useState(true)
  const [sortField, setSortField] = useState<"name" | "joinDate">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [newEmp, setNewEmp] = useState({
    name: "", email: "", departmentName: "", positionName: "", storeId: "none", shiftId: "none", phoneNumber: ""
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  })

  // Unique departments for filter
  const departments = Array.from(new Set(employees.map(e => e.departmentName).filter(Boolean))) as string[]

  let filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) &&
      (deptFilter === "Semua" || e.departmentName === deptFilter) &&
      (storeFilter === "Semua" || e.storeId === storeFilter) &&
      (!hideInactive || e.isActive),
  )

  // Sorting
  filtered = filtered.sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else {
      const dateA = new Date(a.joinDate || 0).getTime()
      const dateB = new Date(b.joinDate || 0).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    }
  })

  function toggleSort(field: "name" | "joinDate") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  function openDetail(e: User) {
    setSelected(e)
    setDraft({ 
      ...e,
      joinDate: e.joinDate ? new Date(e.joinDate) : undefined,
      cycleStartDate: e.cycleStartDate ? new Date(e.cycleStartDate) : undefined,
      weeklyOffDays: e.weeklyOffDays || [],
      halfDays: e.halfDays || [],
      shiftCycle: e.shiftCycle || [],
      leaveQuotaRemaining: e.leaveQuotaRemaining ?? 12,
      phoneNumber: e.phoneNumber || "",
      userDevices: e.userDevices || [],
    })
  }

  async function handleAddEmployee() {
    if (!newEmp.name || !newEmp.email || !newEmp.departmentName || !newEmp.positionName) {
      toast.error("Mohon lengkapi Nama, Email, Departemen, dan Posisi")
      return
    }

    startTransition(async () => {
      let phone = newEmp.phoneNumber.trim()
      if (phone.startsWith('0')) {
        phone = '+62' + phone.slice(1)
      } else if (phone.startsWith('62')) {
        phone = '+' + phone
      }

      const res = await createEmployee({
        name: newEmp.name,
        email: newEmp.email,
        departmentName: newEmp.departmentName,
        positionName: newEmp.positionName,
        storeId: newEmp.storeId === "none" ? null : newEmp.storeId,
        shiftId: newEmp.shiftId === "none" ? null : newEmp.shiftId,
        phoneNumber: phone || null
      })

      if (res.success && res.data) {
        setEmployees(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)))
        setIsAddOpen(false)
        setNewEmp({ name: "", email: "", departmentName: "", positionName: "", storeId: "none", shiftId: "none", phoneNumber: "" })
        toast.success("Karyawan berhasil ditambahkan")
      } else {
        toast.error(res.error || "Gagal menambahkan karyawan")
      }
    })
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !draft) return
    
    setIsUploading(true)
    try {
      const compressed = await compressToWebP(file, 0.90)
      const base64 = await fileToBase64(compressed)
      
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, userId: draft.id })
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
      halfDays: draft.halfDays,
      shiftCycle: draft.shiftCycle,
      cycleStartDate: draft.cycleStartDate,
      storeId: draft.storeId,
      shiftId: draft.shiftId,
      leaveQuotaRemaining: draft.leaveQuotaRemaining,
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

  function toggleHalfDay(dayId: number) {
    if (!draft) return
    const current = draft.halfDays as number[]
    if (current.includes(dayId)) {
      setDraft({ ...draft, halfDays: current.filter(d => d !== dayId) })
    } else {
      setDraft({ ...draft, halfDays: [...current, dayId] })
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
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Tambah Karyawan
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            title={hideInactive ? "Tampilkan Nonaktif" : "Sembunyikan Nonaktif"}
            onClick={() => setHideInactive(!hideInactive)}
            className="shrink-0 hidden sm:flex"
          >
            {hideInactive ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
          </Button>
        </div>
      </GlassCard>

      {/* Mobile Actions Header */}
      <div className="flex items-center justify-between lg:hidden px-1">
        <Button 
          variant="ghost" size="sm" 
          onClick={() => toggleSort("name")}
          className="text-xs text-muted-foreground gap-1"
        >
          Urutkan Nama <ArrowUpDown className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" size="sm" 
          onClick={() => setHideInactive(!hideInactive)}
          className="text-xs text-muted-foreground gap-1"
        >
          {hideInactive ? <><EyeOff className="h-3 w-3" /> Sembunyikan Nonaktif</> : <><Eye className="h-3 w-3" /> Tampilkan Semua</>}
        </Button>
      </div>

      {/* Mobile: cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((e) => (
          <GlassCard key={e.id} className="p-4 w-full overflow-hidden break-words">
            <button onClick={() => openDetail(e)} className="flex w-full items-center gap-3 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary overflow-hidden">
                {e.avatarUrl ? <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" /> : e.name.charAt(0)}
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
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">Karyawan <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSort("joinDate")}>
                  <div className="flex items-center gap-1">Bergabung <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail(e)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary overflow-hidden shrink-0">
                        {e.avatarUrl ? <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" /> : e.name.charAt(0)}
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

      {/* Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden max-w-lg w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Tambah Karyawan Baru</DialogTitle>
            <DialogDescription>
              Karyawan yang ditambahkan di sini akan secara otomatis tersinkronisasi saat mereka login via SSO menggunakan email yang sama.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input placeholder="John Doe" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Email SSO</Label>
              <Input type="email" placeholder="john.doe@hnsitcenter.id" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Departemen</Label>
                <div className="flex flex-col gap-2">
                  <Select value={departments.includes(newEmp.departmentName) ? newEmp.departmentName : ""} onValueChange={v => setNewEmp({...newEmp, departmentName: v})}>
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Atau ketik departemen baru" value={newEmp.departmentName} onChange={e => setNewEmp({...newEmp, departmentName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Posisi</Label>
                <div className="flex flex-col gap-2">
                  <Select value={positions.includes(newEmp.positionName) ? newEmp.positionName : ""} onValueChange={v => setNewEmp({...newEmp, positionName: v})}>
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Atau ketik posisi baru" value={newEmp.positionName} onChange={e => setNewEmp({...newEmp, positionName: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Telepon (opsional)</Label>
              <Input placeholder="08..." value={newEmp.phoneNumber} onChange={e => setNewEmp({...newEmp, phoneNumber: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Penugasan Toko</Label>
                <Select value={newEmp.storeId} onValueChange={v => setNewEmp({...newEmp, storeId: v})}>
                  <SelectTrigger className="w-full bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pusat / Tidak Ada</SelectItem>
                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Penugasan Shift</Label>
                <Select value={newEmp.shiftId} onValueChange={v => setNewEmp({...newEmp, shiftId: v})}>
                  <SelectTrigger className="w-full bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ditentukan</SelectItem>
                    {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAddEmployee} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Karyawan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Edit dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden max-w-2xl w-[calc(100vw-2rem)] sm:w-full p-0">
          {draft && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-xl font-semibold text-secondary overflow-hidden relative shrink-0">
                      {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" className="h-full w-full object-cover" /> : draft.name.charAt(0)}
                      <div className="absolute inset-0 bg-black/40 items-center justify-center flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="break-words leading-tight">{draft.name}</DialogTitle>
                    <DialogDescription className="truncate">
                      Edit profil dan jadwal karyawan
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 py-4 grid gap-6">
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

                <div className="space-y-1.5">
                  <Label>Nomor Telepon (WhatsApp)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input value={draft.phoneNumber || 'Belum diisi'} disabled className="bg-muted flex-1 min-w-[200px]" />
                    {draft.phoneNumber && (
                      <Button variant="outline" className="gap-2 shrink-0 border-success text-success hover:bg-success hover:text-white" onClick={() => window.open(`https://wa.me/${draft.phoneNumber.replace('+', '')}`, '_blank')}>
                        <Phone className="h-4 w-4" />
                        Chat WA
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Karyawan dapat mengubah nomor ini dari menu Profil mereka.</p>
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
                      <AlertDialogContent className="w-[90vw] max-w-md p-6">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ubah Tanggal Bergabung?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Mengubah tanggal bergabung karyawan ini berpotensi me-reset dan menghitung ulang periode kuota cuti tahunannya. Apakah Anda yakin ingin melanjutkannya?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-center py-4">
                          <Calendar
                            mode="single"
                            selected={draft.joinDate}
                            onSelect={(d) => d && setDraft({ ...draft, joinDate: d })}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1990}
                            toYear={2030}
                            className="rounded-md border"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal (Tutup)</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label>Sisa Kuota Cuti</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input value={draft.leaveQuotaRemaining} disabled className="bg-muted w-full sm:w-20" />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            Ubah Manual
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ubah Sisa Kuota Cuti?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Mengubah sisa kuota cuti secara manual akan menimpa perhitungan sistem yang ada. Masukkan jumlah sisa cuti saat ini:
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Label>Jumlah Sisa Cuti</Label>
                            <Input 
                              type="number" 
                              value={draft.leaveQuotaRemaining} 
                              onChange={(e) => setDraft({...draft, leaveQuotaRemaining: parseInt(e.target.value) || 0})}
                              className="mt-2"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Tutup</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
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
                    <Label>Shift Tetap / Utama</Label>
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

                  <div className="space-y-2 pt-4 border-t border-border mt-4">
                    <div className="flex items-center justify-between">
                      <Label>Siklus Rotasi (Opsi Tambahan)</Label>
                      <Button 
                        size="sm" variant="outline" 
                        onClick={() => setDraft({...draft, shiftCycle: [...draft.shiftCycle, "none"]})}
                        className="h-8 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Tambah Minggu
                      </Button>
                    </div>
                    {draft.shiftCycle.length > 0 && (
                      <div className="space-y-3">
                        {draft.shiftCycle.map((cycleShiftId: string, idx: number) => (
                          <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                            <Label className="w-20 shrink-0">Minggu {idx + 1}</Label>
                            <Select 
                              value={cycleShiftId || "none"} 
                              onValueChange={(v) => {
                                const newCycle = [...draft.shiftCycle]
                                newCycle[idx] = v
                                setDraft({...draft, shiftCycle: newCycle})
                              }}
                            >
                              <SelectTrigger className="w-full bg-input">
                                <SelectValue placeholder="Pilih Shift" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tidak ada</SelectItem>
                                {shifts.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" size="icon" className="text-destructive shrink-0"
                              onClick={() => {
                                const newCycle = [...draft.shiftCycle]
                                newCycle.splice(idx, 1)
                                setDraft({...draft, shiftCycle: newCycle})
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <div className="space-y-1.5 pt-2">
                          <Label>Tanggal Mulai Siklus (Anchor)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal bg-input")}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {draft.cycleStartDate ? format(draft.cycleStartDate, "PPP", { locale: id }) : <span>Pilih tanggal (Senin)</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={draft.cycleStartDate}
                                onSelect={(d) => d && setDraft({ ...draft, cycleStartDate: d })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">Tanggal ini akan menjadi indeks ke-0 (Minggu 1) dalam perhitungan rotasi.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hari Libur Rutin (Weekly Off)</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`off-${day.id}`}
                          checked={draft.weeklyOffDays.includes(day.id)}
                          onCheckedChange={() => toggleOffDay(day.id)}
                          className={!draft.weeklyOffDays.includes(day.id) ? "bg-input" : ""}
                        />
                        <label
                          htmlFor={`off-${day.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hari Half Day (Setengah Hari)</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`half-${day.id}`}
                          checked={draft.halfDays.includes(day.id)}
                          onCheckedChange={() => toggleHalfDay(day.id)}
                          className={!draft.halfDays.includes(day.id) ? "bg-input" : ""}
                        />
                        <label
                          htmlFor={`half-${day.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <DialogFooter className="gap-2 sm:gap-0 p-6 pt-0 mt-auto">
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
