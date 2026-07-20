import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { PayslipPrintView } from "@/components/hris/pages/payslip-print-view"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Slip Gaji | HNS IT Center HRIS",
}

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ slipId: string }>
}) {
  const { slipId } = await params
  const ssoUser = await getServerUser()

  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, role: true },
  })
  if (!dbUser) redirect("/login")

  // Fetch the slip — must belong to this user (or HRD/BOSS can view any)
  const slip = await prisma.payrollSlip.findUnique({
    where: { id: slipId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          positionName: true,
          departmentName: true,
          joinDate: true,
          store: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
  })

  if (!slip) notFound()

  // Security: employees can only view their own slips (and it must be published)
  const isAdmin = dbUser.role === "HRD" || dbUser.role === "BOSS" || dbUser.role === "ADMIN"
  if (!isAdmin) {
    if (slip.userId !== dbUser.id) notFound()
    if (!slip.isPublished) notFound()
  }

  return <PayslipPrintView slip={slip as any} />
}
