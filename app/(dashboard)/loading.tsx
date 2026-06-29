import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat data...</p>
    </div>
  )
}
