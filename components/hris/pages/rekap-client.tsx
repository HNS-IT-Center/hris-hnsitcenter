'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Printer, Download, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DatePickerWithRange } from '@/components/hris/shared/date-range-picker'
import { type DateRange } from "react-day-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecapData, DepartmentStat } from '@/app/actions/rekap'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GlassCard } from '@/components/hris/shared'

type Props = {
  recapList: RecapData[]
  deptStats: DepartmentStat[]
  startDate: string
  endDate: string
  availableDepartments: string[]
  availableStores: string[]
  currentDepartment?: string
  currentStore?: string
}

export function RekapClient({ recapList, deptStats, startDate, endDate, availableDepartments, availableStores, currentDepartment, currentStore }: Props) {
  const router = useRouter()
  const sDate = parseISO(startDate)
  const eDate = parseISO(endDate)
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: sDate,
    to: eDate
  })
  const [deptFilter, setDeptFilter] = useState(currentDepartment || "Semua")
  const [storeFilter, setStoreFilter] = useState(currentStore || "Semua")

  const applyFilters = () => {
    const q = new URLSearchParams()
    if (dateRange?.from) q.set('startDate', dateRange.from.toISOString())
    if (dateRange?.to) q.set('endDate', dateRange.to.toISOString())
    if (deptFilter !== 'Semua') q.set('department', deptFilter)
    if (storeFilter !== 'Semua') q.set('store', storeFilter)
    router.push(`/hrd/rekap?${q.toString()}`)
  }
  
  // Ambil top performers (paling sering masuk)
  const sortedRecap = [...recapList].sort((a, b) => b.stats.present - a.stats.present)
  const topPerformers = sortedRecap.slice(0, 3)
  
  // Ambil sering telat
  const lateRecap = [...recapList].filter(a => a.stats.late > 0).sort((a, b) => b.stats.late - a.stats.late)
  const frequentLate = lateRecap.slice(0, 3)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="w-full">
      {/* 
        Style Khusus Print:
        - Set ukuran kertas ke A4 Landscape
        - Hilangkan background abu-abu saat diprint
        - Sembunyikan elemen .no-print (seperti tombol cetak & sidebar nav)
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 landscape; margin: 15mm; }
          body, main { background-color: white !important; }
          .no-print { display: none !important; }
          .pdf-container { 
             width: 100%; 
             max-width: none; 
             margin: 0; 
             box-shadow: none; 
             border: none;
             background-color: white !important;
             min-height: auto !important;
          }
          /* Ensure table rows don't break across pages */
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          /* Hilangkan sidebar dari layout root Next.js jika ada */
          #app-sidebar { display: none !important; }
          #app-topbar { display: none !important; }
          .dashboard-main-content { padding: 0 !important; margin: 0 !important; }
        }
      `}} />

      {/* Kontrol Layar (Tidak diprint) */}
      <GlassCard className="no-print mb-6 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/10 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-primary">Rekapitulasi Absensi</h1>
            <p className="text-sm text-muted-foreground">Sesuaikan filter sebelum mencetak PDF.</p>
          </div>
          <Button onClick={handlePrint} className="gap-2 bg-primary text-primary-foreground w-full sm:w-auto">
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Rentang Tanggal</label>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          <div className="w-full md:w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Departemen</label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="bg-input h-10">
                <SelectValue placeholder="Semua Dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Dept</SelectItem>
                {availableDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Toko</label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="bg-input h-10">
                <SelectValue placeholder="Semua Toko" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Toko</SelectItem>
                {availableStores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full md:w-auto gap-2">
              <Search className="w-4 h-4" />
              Terapkan Filter
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Kontainer PDF A4 Landscape */}
      <div className="pdf-container bg-background border border-primary/10 sm:rounded-xl sm:shadow-lg flex flex-col w-full min-h-[794px]" style={{ maxWidth: '297mm', margin: '0 auto' }}>
        
        {/* Header Kertas */}
        <header className="flex justify-between items-center w-full px-8 py-6 bg-background border-b border-primary/10">
          <div>
             <div className="text-2xl font-bold text-primary tracking-tight">HNS IT Center</div>
             <div className="text-sm text-muted-foreground mt-1">Rekapitulasi Kehadiran & Performa</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">Periode Penggajian</div>
            <div className="text-xs text-muted-foreground font-medium">
              {format(sDate, 'dd MMM yyyy', { locale: localeID })} - {format(eDate, 'dd MMM yyyy', { locale: localeID })}
            </div>
          </div>
        </header>

        {/* Konten Utama (1/4 Kiri, 3/4 Kanan) */}
        <div className="flex-1 flex px-8 py-6 gap-6 overflow-hidden bg-background">
          
          {/* KIRI: Summary Sidebar (1/4) */}
          <div className="w-1/4 flex flex-col gap-6">
            
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Ringkasan Tim</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Performa Terbaik</div>
                  <div className="flex flex-wrap gap-1.5">
                    {topPerformers.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                    {topPerformers.map(t => (
                      <Badge key={t.employee.id} variant="default" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                        {t.employee.name.split(' ')[0]}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="h-px bg-primary/10 w-full" />
                
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sering Terlambat</div>
                  <div className="flex flex-wrap gap-1.5">
                    {frequentLate.length === 0 && <span className="text-xs text-emerald-600">Nihil</span>}
                    {frequentLate.map(t => (
                      <Badge key={t.employee.id} variant="destructive" className="text-[10px]">
                        {t.employee.name.split(' ')[0]} ({t.stats.late})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex-1">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Statistik Departemen</h2>
              <div className="space-y-4">
                {deptStats.map(d => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground truncate pr-2">{d.name}</span>
                      <span className="text-foreground font-semibold">{d.attendanceRate}%</span>
                    </div>
                    <Progress value={d.attendanceRate} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* KANAN: Data Table (3/4) */}
          <div className="w-3/4 flex flex-col bg-background border border-primary/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto flex-1">
              <Table className="w-full text-xs">
                <TableHeader className="bg-primary/5 sticky top-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground w-[220px]">Karyawan</TableHead>
                    <TableHead className="font-semibold text-foreground w-[120px]">Departemen</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Hadir</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Telat</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Alpha</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Izin</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Cuti</TableHead>
                    <TableHead className="font-semibold text-foreground text-center" title="Lupa Checkout/In">Lupa CO</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-4">Rata2 Datang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recapList.map((row) => {
                    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2)
                    return (
                      <TableRow key={row.employee.id} className="hover:bg-primary/5 transition-colors border-primary/5">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 border border-primary/10">
                              <AvatarFallback className="text-[9px] bg-primary/10">{getInitials(row.employee.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{row.employee.name}</div>
                              <div className="text-[10px] text-muted-foreground">{row.employee.employeeId || 'No ID'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">{row.employee.department}</TableCell>
                        
                        <TableCell className="py-2.5 text-center font-medium text-foreground">{row.stats.present}</TableCell>
                        
                        <TableCell className="py-2.5 text-center">
                          {row.stats.late > 0 ? (
                            <Badge variant="destructive" className="px-1.5 h-4 text-[10px] min-w-[20px] justify-center">{row.stats.late}</Badge>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-2.5 text-center">
                          {row.stats.alpha > 0 ? (
                            <span className="text-destructive font-bold">{row.stats.alpha}</span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-2.5 text-center">{row.stats.izin > 0 ? <span className="text-sky-600 font-medium">{row.stats.izin}</span> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                        <TableCell className="py-2.5 text-center">{row.stats.cuti > 0 ? <span className="text-sky-600 font-medium">{row.stats.cuti}</span> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                        
                        <TableCell className="py-2.5 text-center">
                          {row.stats.forgotInOut > 0 ? (
                            <Badge variant="secondary" className="px-1.5 h-4 text-[10px] bg-amber-500/20 text-amber-700 min-w-[20px] justify-center">{row.stats.forgotInOut}</Badge>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-2.5 text-right pr-4 font-mono text-[11px] text-muted-foreground">
                          {row.stats.avgArrival}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Navigasi Tabel (Hanya di layar) dihapus agar semua baris bisa diprint sekaligus */}
          </div>

        </div>

        {/* Footer Kertas */}
        <footer className="flex justify-between items-center w-full px-8 py-4 bg-primary/5 border-t border-primary/10 mt-auto">
          <div className="text-[10px] font-medium text-muted-foreground">
            Dicetak oleh Sistem HRIS pada {format(new Date(), 'dd MMM yyyy HH:mm', { locale: localeID })}
          </div>
          <div className="text-[10px] font-medium text-muted-foreground">
            Halaman 1 dari 1
          </div>
        </footer>

      </div>
    </div>
  )
}
