import { LeavePage } from "@/components/hris/pages/leave"
import { getPendingLeaveRequests } from "@/app/actions/leave"

export default async function Page() {
  const pendingRequests = await getPendingLeaveRequests()
  return <LeavePage role="hrd" pendingRequests={pendingRequests} />
}
