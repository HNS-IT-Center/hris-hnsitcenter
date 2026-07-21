"use client"

import dynamic from "next/dynamic"

const AttendanceMapClient = dynamic(() => import("./attendance-map-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] w-full flex-col items-center justify-center rounded-xl border bg-muted/50 p-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-muted-foreground">Memuat Peta...</p>
    </div>
  ),
})

export function AttendanceMap({ initialData, hrdStoreCoords }: { initialData: any, hrdStoreCoords?: { lat: number, lng: number, name: string } }) {
  return <AttendanceMapClient initialData={initialData} hrdStoreCoords={hrdStoreCoords} />
}
