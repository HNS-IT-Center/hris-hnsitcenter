import { HrdAnomalies } from "@/components/hris/pages/hrd-anomalies"
import { prisma } from "@/lib/prisma"
import { getServerUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Page(props: { searchParams: Promise<{ date?: string }> }) {
  const user = await getServerUser()
  
  if (user.globalRole !== "HRD" && user.globalRole !== "hrd") {
    redirect("/dashboard")
  }

  const searchParams = await props.searchParams
  const dateStr = searchParams?.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  const selectedDate = new Date(`${dateStr}T00:00:00Z`)
  
  const endOfDay = new Date(selectedDate)
  endOfDay.setUTCDate(selectedDate.getUTCDate() + 1)

  const flags = await prisma.attentionFlag.findMany({
    where: {
      createdAt: {
        gte: selectedDate,
        lt: endOfDay
      }
    },
    include: {
      user: true,
      attendance: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return <HrdAnomalies initialDate={dateStr} flags={flags as any} />
}
