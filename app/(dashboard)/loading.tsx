import { GlassCard } from "@/components/hris/shared"

export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header / Filter Skeleton */}
      <GlassCard className="flex flex-col gap-3 lg:flex-row lg:items-center overflow-hidden w-full h-16" />
      
      {/* Desktop Table / Grid Skeleton */}
      <GlassCard className="hidden lg:block w-full p-6">
        <div className="space-y-4">
          <div className="h-6 w-full bg-muted/40 rounded-md" />
          <div className="h-10 w-full bg-muted/20 rounded-md" />
          <div className="h-10 w-full bg-muted/20 rounded-md" />
          <div className="h-10 w-full bg-muted/20 rounded-md" />
          <div className="h-10 w-full bg-muted/20 rounded-md" />
        </div>
      </GlassCard>

      {/* Mobile Card Skeleton */}
      <div className="grid gap-3 lg:hidden">
        <GlassCard className="p-4 w-full h-24" />
        <GlassCard className="p-4 w-full h-24" />
        <GlassCard className="p-4 w-full h-24" />
      </div>
    </div>
  )
}
