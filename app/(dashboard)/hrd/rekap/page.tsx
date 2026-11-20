import { getMonthlyRecap } from "@/app/actions/rekap"
import { RekapClient } from "@/components/hris/pages/rekap-client"
import { getPayrollPeriod } from "@/lib/utils/date"
import { prisma } from "@/lib/prisma"

export default async function RekapPage(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string; department?: string; store?: string }>
}) {
  const searchParams = await props.searchParams

  // Default to the current payroll period (26th - 25th, WIB), the same days as the payslip
  const period = getPayrollPeriod(new Date())
  let startDate = period.startDateUTC
  let endDate = period.endDateUTC

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
