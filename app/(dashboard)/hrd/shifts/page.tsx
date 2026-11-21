import { redirect } from "next/navigation"

// Moved to the Pusat Pengaturan Absensi (tab Shift).
export default function Page() {
  redirect("/hrd/pengaturan-absensi?tab=shift")
}
