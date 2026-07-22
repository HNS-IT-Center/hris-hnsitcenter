"use server"

import { prisma } from "@/lib/prisma"
import { getServerUser, hasRole } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { OvertimeStatus } from "@prisma/client"
import { z } from "zod"

export async function submitOvertimeRequest(data: {
  overtimeDate: Date
  startTime: Date
  endTime: Date
  task: string
}) {
  try {
    const user = await getServerUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true }
    })
    if (!dbUser) return { success: false, error: "User not found in local database" }

    // Hitung total hours (end - start)
    const diffMs = data.endTime.getTime() - data.startTime.getTime()
    if (diffMs <= 0) {
      return { success: false, error: "Waktu selesai harus lebih dari waktu mulai." }
    }
    const totalHours = diffMs / (1000 * 60 * 60)

    const req = await prisma.overtimeRequest.create({
      data: {
        userId: dbUser.id,
        overtimeDate: data.overtimeDate,
        startTime: data.startTime,
        endTime: data.endTime,
        totalHours,
        task: data.task,
        status: "PENDING"
      }
    })

    revalidatePath("/performance")
    revalidatePath("/hrd/lembur")
    revalidatePath("/leave")
    revalidatePath("/hrd/leave")
    revalidatePath("/hrd/dashboard")
    revalidatePath("/dashboard")

    return { success: true, data: req }
  } catch (error: any) {
    console.error("submitOvertimeRequest error:", error)
    return { success: false, error: "Gagal mengajukan lembur" }
  }
}

export async function getAllOvertimeRequests() {
  return await prisma.overtimeRequest.findMany({
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, departmentName: true, positionName: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })
}

export async function getMyOvertimeRequests() {
  const user = await getServerUser()
  if (!user) return []

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true }
  })
  if (!dbUser) return []

  return await prisma.overtimeRequest.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" }
  })
}

export async function approveOvertimeRequest(id: string, approve: boolean, rejectReason?: string) {
  try {
    if (!(await hasRole('HRD', 'BOSS', 'ADMIN', 'SUPER_ADMIN'))) return { success: false, error: "Unauthorized" }

    const req = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        rejectReason: approve ? null : (rejectReason || null)
      }
    })

    revalidatePath("/hrd/lembur")
    revalidatePath("/performance")
    revalidatePath("/leave")
    revalidatePath("/hrd/leave")
    revalidatePath("/hrd/dashboard")
    revalidatePath("/dashboard")

    return { success: true, data: req }
  } catch (error: any) {
    console.error("approveOvertimeRequest error:", error)
    return { success: false, error: "Gagal memproses persetujuan" }
  }
}
