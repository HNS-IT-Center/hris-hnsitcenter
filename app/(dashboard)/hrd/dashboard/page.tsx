import { HrdDashboard } from "@/components/hris/pages/hrd-dashboard"
import { getHrdDashboardData } from "@/app/actions/dashboard"

export default async function HrdDashboardPage() {
  const data = await getHrdDashboardData()
  return <HrdDashboard data={data} />
}
