import { Metadata } from "next"
import { getServerUser, hasRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllOvertimeRequests } from "@/app/actions/overtime"
import { LemburPage } from "@/components/hris/pages/lembur"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Approval Lembur - HRIS",
  description: "Manajemen pengajuan lembur karyawan",
}

export default async function Page() {
  const user = await getServerUser()
  if (!(await hasRole('HRD', 'BOSS', 'ADMIN', 'SUPER_ADMIN'))) {
    redirect("/")
  }

  const allRequests = await getAllOvertimeRequests()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href="/hrd">HRD Dashboard</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Approval Lembur</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Approval Lembur</h2>
      </div>
      <LemburPage allRequests={allRequests} />
    </div>
  )
}
