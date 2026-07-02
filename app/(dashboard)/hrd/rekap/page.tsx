import { getMonthlyRecap } from "@/app/actions/rekap"
import { RekapClient } from "@/components/hris/pages/rekap-client"
import { format, subMonths, startOfMonth, endOfMonth, setDate } from "date-fns"

export default async function RekapPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  // Default to 26 last month - 25 this month
  const today = new Date()
  let startDate = new Date()
  let endDate = new Date()

  if (today.getDate() <= 25) {
    // We are before 25th, so period is 26th of 2 months ago to 25th of last month?
    // Wait, if today is July 2, period is June 26 to July 25.
    startDate = setDate(subMonths(today, 1), 26)
    endDate = setDate(today, 25)
  } else {
    // If today is July 26, period is July 26 to Aug 25
    startDate = setDate(today, 26)
    endDate = setDate(subMonths(today, -1), 25) // add 1 month
  }

  // Allow override via search param format YYYY-MM
  if (searchParams.period) {
    const [y, m] = searchParams.period.split('-').map(Number)
    const refDate = new Date(y, m - 1, 10) // 10th of that month
    startDate = setDate(subMonths(refDate, 1), 26)
    endDate = setDate(refDate, 25)
  }

  const { recapList, deptStats } = await getMonthlyRecap(startDate.toISOString(), endDate.toISOString())

  return (
    <RekapClient 
      recapList={recapList} 
      deptStats={deptStats} 
      startDate={startDate.toISOString()} 
      endDate={endDate.toISOString()} 
    />
  )
}
