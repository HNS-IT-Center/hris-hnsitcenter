import { getPayrollSlip } from "@/app/actions/payroll"
import { PayslipPrintView } from "@/components/hris/pages/payslip-print-view"
import { notFound } from "next/navigation"
import { getServerUser } from "@/lib/auth"

export default async function PrintPayrollPage(props: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ periodStart?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  // Auth check
  try {
    const user = await getServerUser()
    if (user.role !== "HRD" && user.role !== "BOSS") {
      return <div className="p-8 text-red-500 font-bold text-center mt-10">Unauthorized: Only HRD or BOSS can access this print view.</div>
    }
  } catch (error) {
    return <div className="p-8 text-red-500 font-bold text-center mt-10">Unauthorized: Please login first.</div>
  }

  if (!searchParams.periodStart) {
    return <div className="p-8 text-red-500 font-bold text-center mt-10">Error: periodStart parameter is required.</div>
  }

  const periodStart = new Date(searchParams.periodStart)
  const slip = await getPayrollSlip(params.userId, periodStart)

  if (!slip) {
    return (
      <div className="p-8 text-center mt-10 text-gray-500">
        Slip Gaji untuk periode ini belum digenerate atau tidak ditemukan.
      </div>
    )
  }

  return (
    <PayslipPrintView slip={slip as any} />
  )
}
