"use client"

import { useState } from "react"
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
import { EMPLOYEES, type Employee } from "@/lib/hris-data"
import { cn } from "@/lib/utils"
import { Briefcase, CalendarDays, ChevronRight, Clock, Download, MapPin, Search } from "lucide-react"

const DEPARTMENTS = ["Semua", "Engineering", "Sales", "Operations", "Finance"]
const STORE_OPTS = ["Semua", "HNS Pusat", "HNS Mall Kelapa Gading", "HNS Bandung", "HNS Surabaya"]
const DEPT_OPTS = ["Engineering", "Sales", "Operations", "Finance", "HR"]
const STORE_EDIT = ["HNS Pusat", "HNS Mall Kelapa Gading", "HNS Bandung", "HNS Surabaya"]
const SHIFT_OPTS = ["Pagi", "Siang", "Malam"]

function StatusBadge({ status }: { status: Employee["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "active"
          ? "border-success/30 bg-success/15 text-success"
          : "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      {status === "active" ? "Aktif" : "Nonaktif"}
    </span>
  )
}

export function EmployeesPage() {
  const [q, setQ] = useState("")
  const [dept, setDept] = useState("Semua")
  const [store, setStore] = useState("Semua")
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [draft, setDraft] = useState<Employee | null>(null)

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) &&
      (dept === "Semua" || e.department === dept) &&
      (store === "Semua" || e.store === store),
  )

  function openDetail(e: Employee) {
    setSelected(e)
    setDraft({ ...e })
  }

  function save() {
    if (!draft) return
    if (!draft.name.trim()) {
      toast.error("Nama wajib diisi")
      return
    }
    setEmployees((prev) => prev.map((e) => (e.id === draft.id ? draft : e)))
    toast.success("Data karyawan diperbarui", { description: draft.name })
    setSelected(null)
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <GlassCard className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari karyawan..." className="pl-9 bg-input" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-full bg-input sm:w-40">
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger className="w-full bg-input sm:w-44">
              <SelectValue placeholder="Toko" />
            </SelectTrigger>
            <SelectContent>
              {STORE_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </GlassCard>

      {/* Mobile: cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((e) => (
          <GlassCard key={e.id} className="p-4">
            <button onClick={() => openDetail(e)} className="flex w-full items-center gap-3 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary">
                {e.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-foreground">{e.name}</p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {e.position} • {e.id}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {e.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {e.store}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {e.shift}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <GlassCard className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada karyawan yang cocok dengan filter.
          </GlassCard>
        )}
      </div>

      {/* Desktop: table */}
      <GlassCard className="hidden overflow-hidden p-0 lg:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail(e)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
                        {e.initials}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.department}</TableCell>
                  <TableCell className="text-muted-foreground">{e.position}</TableCell>
                  <TableCell className="text-muted-foreground">{e.store}</TableCell>
                  <TableCell className="text-muted-foreground">{e.shift}</TableCell>
                  <TableCell className="text-muted-foreground">{e.joinDate}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-base font-semibold text-secondary">
                    {draft.initials}
                  </div>
                  <div>
                    <DialogTitle>{draft.name}</DialogTitle>
                    <DialogDescription>
                      {draft.id} • Edit detail karyawan
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-name">Nama Lengkap</Label>
                  <Input
                    id="emp-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="bg-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-pos">Posisi</Label>
                  <Input
                    id="emp-pos"
                    value={draft.position}
                    onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                    className="bg-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Departemen</Label>
                    <Select value={draft.department} onValueChange={(v) => setDraft({ ...draft, department: v })}>
                      <SelectTrigger className="w-full bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPT_OPTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift</Label>
                    <Select value={draft.shift} onValueChange={(v) => setDraft({ ...draft, shift: v })}>
                      <SelectTrigger className="w-full bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Toko</Label>
                  <Select value={draft.store} onValueChange={(v) => setDraft({ ...draft, store: v })}>
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_EDIT.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-join" className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Bergabung
                    </Label>
                    <Input
                      id="emp-join"
                      value={draft.joinDate}
                      onChange={(e) => setDraft({ ...draft, joinDate: e.target.value })}
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={draft.status}
                      onValueChange={(v) => setDraft({ ...draft, status: v as Employee["status"] })}
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
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Batal
                </Button>
                <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
