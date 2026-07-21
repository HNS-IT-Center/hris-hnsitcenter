"use server"

import { prisma } from "@/lib/prisma"
import { getServerUser } from "@/lib/auth"
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

    // Hitung total hours (end - start)
    const diffMs = data.endTime.getTime() - data.startTime.getTime()
    if (diffMs <= 0) {
      return { success: false, error: "Waktu selesai harus lebih dari waktu mulai." }
    }
    const totalHours = diffMs / (1000 * 60 * 60)

    const req = await prisma.overtimeRequest.create({
      data: {
        userId: user.id,
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

    return { success: true, data: req }
  } catch (error: any) {
    console.error("submitOvertimeRequest error:", error)
    return { success: false, error: "Gagal mengajukan lembur" }
  }
}

export async function getAllOvertimeRequests() {
  const user = await getServerUser()
  if (!user || user.role !== "HRD") throw new Error("Unauthorized")

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

  return await prisma.overtimeRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  })
}

export async function approveOvertimeRequest(id: string, approve: boolean, rejectReason?: string) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== "HRD") return { success: false, error: "Unauthorized" }

    const req = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        rejectReason: approve ? null : (rejectReason || null)
      }
    })

    revalidatePath("/hrd/lembur")
    revalidatePath("/performance")

    return { success: true, data: req }
  } catch (error: any) {
    console.error("approveOvertimeRequest error:", error)
    return { success: false, error: "Gagal memproses persetujuan" }
  }
}
