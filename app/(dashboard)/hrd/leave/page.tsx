import { LeavePage } from "@/components/hris/pages/leave"
import { getAllLeaveRequests } from "@/app/actions/leave"
import { getAllOvertimeRequests } from "@/app/actions/overtime"

export default async function Page() {
  const [leaveRequests, overtimeRequests] = await Promise.all([
    getAllLeaveRequests(),
    getAllOvertimeRequests()
  ])

  const combinedRequests = [
    ...leaveRequests,
    ...overtimeRequests.map(o => ({
      id: o.id,
      userId: o.userId,
      type: "OVERTIME",
      startDate: o.overtimeDate,
      endDate: o.overtimeDate,
      startTime: o.startTime,
      endTime: o.endTime,
      totalDays: 0,
      totalHours: o.totalHours,
      reason: o.task,
      status: o.status,
      rejectReason: o.rejectReason,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      isPaid: false,
      sickNoteUrl: null,
      user: o.user
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as any[]

  return <LeavePage role="hrd" allRequests={combinedRequests} />
}
