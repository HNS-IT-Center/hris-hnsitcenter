"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon, AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { resolveAttentionFlag } from "@/app/actions/flags"
import { toast } from "sonner"

export function HrdAnomalies({ initialDate, flags }: { initialDate: string, flags: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [date, setDate] = useState<Date>(new Date(initialDate))
  const [isResolving, setIsResolving] = useState<string | null>(null)

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      const params = new URLSearchParams(searchParams.toString())
      params.set('date', format(newDate, 'yyyy-MM-dd'))
      router.push(`?${params.toString()}`)
    }
  }

  const handleResolve = async (flagId: string) => {
    setIsResolving(flagId)
    const res = await resolveAttentionFlag(flagId)
    setIsResolving(null)
    if (res.success) {
      toast.success("Berhasil ditandai sebagai diselesaikan.")
      router.refresh()
    } else {
      toast.error(res.error || "Gagal menyelesaikan.")
    }
  }

  const getCategory = (type: string) => {
    if (['anomaly_checkin'].includes(type)) {
      return { label: 'Kategori 1 (Waspada Kecurangan)', color: 'destructive', icon: AlertTriangle }
    }
    return { label: 'Kategori 2 (Kesalahan Prosedur)', color: 'warning', icon: Info }
  }

  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Log Anomali" 
        desc="Riwayat anomali absensi karyawan berdasarkan tanggal" 
      />

      <GlassCard className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal bg-background/50">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "EEEE, d MMMM yyyy", { locale: id }) : <span>Pilih tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </GlassCard>

      <div className="space-y-4">
        {flags.length === 0 ? (
          <GlassCard className="text-center py-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">Tidak Ada Anomali</h3>
            <p className="text-muted-foreground text-sm">Semua sistem berjalan normal pada hari ini.</p>
          </GlassCard>
        ) : (
          flags.map(flag => {
            const cat = getCategory(flag.type)
            const Icon = cat.icon
            
            return (
              <GlassCard key={flag.id} className="relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${cat.color === 'destructive' ? 'bg-destructive' : 'bg-orange-500'}`} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-4">
                  <div className="space-y-3 w-full">
                    <h4 className="font-semibold text-lg break-words">{flag.user.name}</h4>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={cat.color === 'destructive' ? 'destructive' : 'outline'} className={cat.color === 'warning' ? 'text-orange-500 border-orange-500 bg-orange-500/10' : ''}>
                        <Icon className="mr-1.5 h-3 w-3 shrink-0" />
                        {cat.label}
                      </Badge>
                      {flag.isResolved ? (
                        <Badge variant="secondary" className="bg-success/20 text-success hover:bg-success/30">
                          Diselesaikan
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Belum Diselesaikan
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {flag.description}
                    </p>
                    
                    <p className="text-xs text-muted-foreground/60 pt-1">
                      Terdeteksi pada: {format(new Date(flag.createdAt), 'HH:mm - d MMM yyyy')}
                    </p>
                  </div>
                  
                  {!flag.isResolved && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleResolve(flag.id)}
                      disabled={isResolving === flag.id}
                      className="shrink-0"
                    >
                      {isResolving === flag.id ? "Menyelesaikan..." : "Tandai Selesai"}
                    </Button>
                  )}
                </div>
              </GlassCard>
            )
          })
        )}
      </div>
    </div>
  )
}
