import { redirect } from "next/navigation"

// Moved to the Pusat Pengaturan Absensi (tab Lokasi).
export default function Page() {
  redirect("/hrd/pengaturan-absensi?tab=lokasi")
}
