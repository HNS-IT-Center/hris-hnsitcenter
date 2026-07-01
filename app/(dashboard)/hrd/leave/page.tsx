import { LeavePage } from "@/components/hris/pages/leave"
import { getAllLeaveRequests } from "@/app/actions/leave"

export default async function Page() {
  const allRequests = await getAllLeaveRequests()
  return <LeavePage role="hrd" allRequests={allRequests} />
}
