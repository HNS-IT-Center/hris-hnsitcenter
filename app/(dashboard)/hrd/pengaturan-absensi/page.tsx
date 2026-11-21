import type { Metadata } from "next"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ShiftsPage } from "@/components/hris/pages/shifts"
import { StoresPage } from "@/components/hris/pages/stores"
import { OvertimeSettingsCard } from "@/components/hris/pages/overtime-settings"
import { getShifts } from "@/app/actions/shift"
import { getStores } from "@/app/actions/store"
import { getOvertimeSettings } from "@/app/actions/overtime"

export const metadata: Metadata = {
  title: "Pengaturan Absensi - HRIS",
  description: "Shift, lokasi toko dan aturan lembur",
}

/**
 * Pusat Pengaturan Absensi (docs/perencanaan/pusat-pengaturan-absensi.md).
 * One tab per query value so each tab loads only its own data and old pages
 * can redirect to their tab. Access: /hrd layout (HRD, BOSS, ADMIN); every
 * server action checks the role again.
 */
const TABS = [
  { id: "shift", label: "Shift" },
  { id: "lokasi", label: "Lokasi" },
  { id: "lembur", label: "Lembur" },
] as const

type TabId = (typeof TABS)[number]["id"]

async function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "shift":
      return <ShiftsPage initialShifts={await getShifts()} />
    case "lokasi":
      return <StoresPage initialStores={await getStores()} />
    case "lembur":
      return <OvertimeSettingsCard initial={await getOvertimeSettings()} />
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const active: TabId = TABS.find((t) => t.id === tab)?.id ?? "shift"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pengaturan Absensi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Aturan yang dipakai absensi, log HRD, rekap dan slip gaji.
        </p>
      </div>

      <nav aria-label="Tab pengaturan" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/hrd/pengaturan-absensi?tab=${t.id}`}
              aria-current={t.id === active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                t.id === active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <TabContent tab={active} />
    </div>
  )
}
