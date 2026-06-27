"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlassCard, SectionTitle } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import { Send } from "lucide-react"

const TAGS = [
  { id: "notice", label: "Notice", dot: "bg-muted-foreground" },
  { id: "event", label: "Event", dot: "bg-secondary" },
  { id: "urgent", label: "Urgent", dot: "bg-destructive" },
]

export function BroadcastPage() {
  const [message, setMessage] = useState("")
  const [tag, setTag] = useState("notice")
  const [allEmployees, setAllEmployees] = useState(true)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionTitle title="Broadcast Pengumuman" desc="Kirim pengumuman ke karyawan terpilih." />

      <GlassCard className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Judul</Label>
          <Input id="title" placeholder="Judul pengumuman" className="bg-input" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="message">Pesan</Label>
            <span className="text-xs text-muted-foreground">{message.length}/500</span>
          </div>
          <Textarea
            id="message"
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis isi pengumuman..."
            className="min-h-28 bg-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Tag</Label>
          <RadioGroup value={tag} onValueChange={setTag} className="flex flex-wrap gap-3">
            {TAGS.map((t) => (
              <Label
                key={t.id}
                htmlFor={`tag-${t.id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-all",
                  tag === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                )}
              >
                <RadioGroupItem id={`tag-${t.id}`} value={t.id} />
                <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
                <span className="text-sm text-foreground">{t.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Penerima</Label>
          <Label htmlFor="all-emp" className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border p-3">
            <Checkbox id="all-emp" checked={allEmployees} onCheckedChange={(v) => setAllEmployees(!!v)} />
            <span className="text-sm text-foreground">Semua Karyawan</span>
          </Label>

          {!allEmployees && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { ph: "Departemen", opts: ["Engineering", "Sales", "Operations", "Finance"] },
                { ph: "Toko", opts: ["HNS Pusat", "HNS Bandung", "HNS Surabaya"] },
                { ph: "Shift", opts: ["Pagi", "Siang", "Malam"] },
              ].map((f) => (
                <Select key={f.ph}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder={f.ph} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.opts.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={() => toast.success("Broadcast terkirim", { description: "Pengumuman telah dikirim ke penerima." })}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          Kirim Broadcast
        </Button>
      </GlassCard>
    </div>
  )
}
