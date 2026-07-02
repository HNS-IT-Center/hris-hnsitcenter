import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

export function TimePicker({ value, onChange, id, className }: TimePickerProps) {
  // value format expected: "HH:mm"
  const [hour, min] = value && value.includes(':') ? value.split(':') : ['00', '00']

  return (
    <div className={`flex items-center gap-2 ${className || ''}`} id={id}>
      <Select value={hour} onValueChange={(h) => onChange(`${h}:${min}`)}>
        <SelectTrigger className="w-full min-w-[70px]">
          <SelectValue placeholder="Jam" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {Array.from({ length: 24 }).map((_, i) => {
            const val = i.toString().padStart(2, '0')
            return <SelectItem key={val} value={val}>{val}</SelectItem>
          })}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-medium">:</span>
      <Select value={min} onValueChange={(m) => onChange(`${hour}:${m}`)}>
        <SelectTrigger className="w-full min-w-[70px]">
          <SelectValue placeholder="Mnt" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {Array.from({ length: 60 }).map((_, i) => {
            const val = i.toString().padStart(2, '0')
            return <SelectItem key={val} value={val}>{val}</SelectItem>
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
