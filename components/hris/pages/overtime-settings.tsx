"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Clock, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateOvertimeSettings } from "@/app/actions/overtime"

/** Same rule as lib/overtime.ts billableOvertimeHours, for the live example. */
function billable(minutes: number, threshold: number) {
  const whole = Math.floor(minutes / 60)
  return whole + (minutes - whole * 60 >= threshold ? 1 : 0)
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

export function OvertimeSettingsCard({
  initial,
}: {
  initial: { roundingThresholdMinutes: number; defaultHourlyRate: number }
}) {
  const [threshold, setThreshold] = useState(initial.roundingThresholdMinutes)
  const [rate, setRate] = useState(initial.defaultHourlyRate)
  const [isPending, startTransition] = useTransition()
  const dirty = threshold !== initial.roundingThresholdMinutes || rate !== initial.defaultHourlyRate

  const save = () => {
    startTransition(async () => {
      const res = await updateOvertimeSettings({ roundingThresholdMinutes: threshold, defaultHourlyRate: rate })
      if (res.success) toast.success("Pengaturan lembur disimpan")
      else toast.error(res.error)
    })
  }

  const examples = [45, 90, 110, 150]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Pengaturan Lembur
        </CardTitle>
        <CardDescription>
          Berlaku untuk perhitungan upah lembur di payroll. Tiap pengajuan lembur dibulatkan sendiri-sendiri.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ot-threshold">Sisa menit yang dihitung 1 jam</Label>
            <div className="relative">
              <Input
                id="ot-threshold"
                type="number"
                min={1}
                max={60}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">menit</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sisa menit di atas jam penuh yang mencapai angka ini dihitung 1 jam.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ot-rate">Tarif default per jam</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
              <Input
                id="ot-rate"
                type="number"
                min={0}
                step={1000}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Dipakai bila tarif lembur karyawan di Payroll dikosongkan.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Contoh dengan pengaturan ini</p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {examples.map((m) => {
              const h = billable(m, threshold)
              return (
                <div key={m} className="rounded-md bg-background px-3 py-2 shadow-xs">
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)} jam ` : ""}{m % 60 > 0 ? `${m % 60} menit` : ""}
                  </p>
                  <p className="font-semibold">{h} jam</p>
                  <p className="text-xs text-muted-foreground">{formatRp(h * (Number.isFinite(rate) ? rate : 0))}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
