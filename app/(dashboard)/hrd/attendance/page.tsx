import { HrdAttendanceLogs } from "@/components/hris/pages/hrd-attendance-logs"
import { getHrdAttendanceLogs } from "@/app/actions/dashboard"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const data = await getHrdAttendanceLogs(params.date)
  return <HrdAttendanceLogs initialData={data} />
}
