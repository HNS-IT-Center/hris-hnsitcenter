"use server"

import { prisma } from "@/lib/prisma"
import { getServerUser, hasRole } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { OvertimeStatus } from "@prisma/client"
import { z } from "zod"
import { requirePrivileged } from "@/lib/auth/guards"
import { HRD_AUDIENCE, formatDay, notify } from "@/lib/notify"
import { billableOvertimeHours, formatDuration, getOvertimeRules } from "@/lib/overtime"


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

    await notify(
      { roles: HRD_AUDIENCE, excludeUserIds: [dbUser.id] },
      {
        category: "OVERTIME",
        title: "Pengajuan Lembur Baru",
        body: `${user.name} mengajukan lembur ${formatDuration(diffMs / 60000)} pada ${formatDay(data.overtimeDate)}. Tugas: ${data.task}`,
        url: "/hrd/lembur",
        email: true,
      }
    )

    return { success: true, data: req }
  } catch (error: any) {
    console.error("submitOvertimeRequest error:", error)
    return { success: false, error: "Gagal mengajukan lembur" }
  }
}

export async function getAllOvertimeRequests() {
  await requirePrivileged()
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

    const rules = await getOvertimeRules()
    const minutes = (req.totalHours ?? 0) * 60
    const billable = billableOvertimeHours(minutes, rules.roundingThresholdMinutes)
    await notify(
      { userIds: [req.userId] },
      {
        category: "OVERTIME",
        title: `Pengajuan Lembur ${approve ? "Disetujui" : "Ditolak"}`,
        body: approve
          ? `Lembur ${formatDuration(minutes)} pada ${formatDay(req.overtimeDate)} telah disetujui, dihitung ${billable} jam (bila absen pulang sesuai jadwal lembur).`
          : `Lembur ${formatDuration(minutes)} pada ${formatDay(req.overtimeDate)} ditolak.${req.rejectReason ? ` Alasan: ${req.rejectReason}` : ""}`,
        url: "/leave",
        email: true,
      }
    )

    return { success: true, data: req }
  } catch (error: any) {
    console.error("approveOvertimeRequest error:", error)
    return { success: false, error: "Gagal memproses persetujuan" }
  }
}

/** HRD: current overtime rules. */
export async function getOvertimeSettings() {
  await requirePrivileged()
  return getOvertimeRules()
}

/** HRD: change the rounding threshold and the default hourly rate. */
export async function updateOvertimeSettings(data: { roundingThresholdMinutes: number; defaultHourlyRate: number }) {
  try {
    const actor = await requirePrivileged()
    const threshold = Math.round(Number(data.roundingThresholdMinutes))
    const rate = Math.round(Number(data.defaultHourlyRate))
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 60) {
      return { success: false, error: "Batas pembulatan harus antara 1 dan 60 menit." }
    }
    if (!Number.isFinite(rate) || rate < 0) {
      return { success: false, error: "Tarif lembur tidak boleh negatif." }
    }

    await prisma.overtimeSetting.upsert({
      where: { id: "default" },
      update: { roundingThresholdMinutes: threshold, defaultHourlyRate: rate, updatedById: actor.id },
      create: { id: "default", roundingThresholdMinutes: threshold, defaultHourlyRate: rate, updatedById: actor.id },
    })
    revalidatePath("/hrd/lembur")
    revalidatePath("/hrd/payroll")
    return { success: true }
  } catch (error) {
    console.error("updateOvertimeSettings error:", error)
    return { success: false, error: "Gagal menyimpan pengaturan lembur." }
  }
}
