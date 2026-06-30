import { HrdDashboard } from "@/components/hris/pages/hrd-dashboard"
import { getHrdDashboardData } from "@/app/actions/dashboard"

export default async function HrdDashboardPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams
  const dateStr = searchParams?.date
  const data = await getHrdDashboardData(dateStr)
  return <HrdDashboard data={data} />
}
