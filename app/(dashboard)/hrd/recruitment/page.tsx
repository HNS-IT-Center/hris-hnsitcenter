import { RecruitmentPage } from "@/components/hris/pages/recruitment"
import { prisma } from "@/lib/prisma"

export default async function Page() { 
  const deptData = await prisma.user.findMany({
    where: { departmentName: { not: null } },
    select: { departmentName: true },
    distinct: ['departmentName']
  })
  
  const posData = await prisma.user.findMany({
    where: { positionName: { not: null } },
    select: { positionName: true },
    distinct: ['positionName']
  })

  const departments = deptData.map(d => d.departmentName as string).sort()
  const positions = posData.map(p => p.positionName as string).sort()

  return <RecruitmentPage departments={departments} positions={positions} /> 
}
