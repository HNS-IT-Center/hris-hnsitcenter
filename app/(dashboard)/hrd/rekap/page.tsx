import { getMonthlyRecap } from "@/app/actions/rekap"
import { RekapClient } from "@/components/hris/pages/rekap-client"
import { format, subMonths, startOfMonth, endOfMonth, setDate } from "date-fns"
import { prisma } from "@/lib/prisma"

export default async function RekapPage(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string; department?: string; store?: string }>
}) {
  const searchParams = await props.searchParams

  // Default to 26 last month - 25 this month
  const today = new Date()
  let startDate = new Date()
  let endDate = new Date()

  if (today.getDate() <= 25) {
    startDate = setDate(subMonths(today, 1), 26)
    endDate = setDate(today, 25)
  } else {
    startDate = setDate(today, 26)
    endDate = setDate(subMonths(today, -1), 25)
  }

  // Allow override via searchParams
  if (searchParams.startDate) startDate = new Date(searchParams.startDate)
  if (searchParams.endDate) endDate = new Date(searchParams.endDate)

  const { recapList, deptStats } = await getMonthlyRecap(
    startDate.toISOString(), 
    endDate.toISOString(),
    searchParams.department,
    searchParams.store
  )

  // Fetch unique filter options
  const departments = await prisma.department.findMany({ select: { name: true } })
  const stores = await prisma.store.findMany({ select: { name: true } })

  return (
    <RekapClient 
      recapList={recapList} 
      deptStats={deptStats} 
      startDate={startDate.toISOString()} 
      endDate={endDate.toISOString()} 
      availableDepartments={departments.map(d => d.name)}
      availableStores={stores.map(s => s.name)}
      currentDepartment={searchParams.department}
      currentStore={searchParams.store}
    />
  )
}
