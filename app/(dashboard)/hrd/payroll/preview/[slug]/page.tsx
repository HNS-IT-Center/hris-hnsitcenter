import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PayslipPrintView } from "@/components/hris/pages/payslip-print-view"
import type { Metadata } from "next"
import { UnauthorizedRedirect } from "./unauthorized-redirect"

export const metadata: Metadata = {
  title: "Preview Slip Gaji | HRD | HNS IT Center HRIS",
}

export default async function HRDPayslipPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ssoUser = await getServerUser()

  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, role: true },
  })
  
  if (!dbUser) {
    return <UnauthorizedRedirect />
  }

  // Security: only HRD, BOSS, or ADMIN can access this preview route.
  const isAdmin = dbUser.role === "HRD" || dbUser.role === "BOSS" || dbUser.role === "ADMIN"
  if (!isAdmin) {
    return <UnauthorizedRedirect />
  }

  // Fetch the slip by slug
  const slip = await prisma.payrollSlip.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          employeeId: true,
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

  return <PayslipPrintView slip={slip as any} />
}
