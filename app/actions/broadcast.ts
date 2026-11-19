'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth'
import { requirePrivileged } from '@/lib/auth/guards'
import { deliverBroadcast } from '@/lib/broadcast-delivery'

export type BroadcastWithFilters = Awaited<ReturnType<typeof getBroadcasts>>[number]

/**
 * Fetches all broadcasts ordered by creation date descending.
 */
export async function getBroadcasts() {
  await requirePrivileged()
  return prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      filterDepts: true,
      filterStores: true,
      filterShifts: true,
      filterUsers: { include: { user: { select: { name: true } } } },
    },
  })
}

/**
 * Creates a new Broadcast record with filter records.
 * If scheduledAt is null, the broadcast cron will pick it up immediately on next run.
 */
export async function createBroadcast(data: {
  title: string
  message: string
  tag: 'NOTICE' | 'EVENT' | 'URGENT'
  scheduledAt: Date | null
  allEmployees: boolean
  departmentIds: string[]
  storeIds: string[]
  shiftIds: string[]
  userIds: string[]
}) {
  try {
    const ssoUser = await getServerUser()
    if (!ssoUser) return { success: false, error: 'Unauthorized' }
    const creator = await prisma.user.findUnique({ where: { email: ssoUser.email } })
    if (!creator || !['HRD', 'BOSS', 'ADMIN'].includes(creator.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!data.title.trim()) return { success: false, error: 'Judul tidak boleh kosong.' }
    if (!data.message.trim()) return { success: false, error: 'Pesan tidak boleh kosong.' }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        tag: data.tag,
        scheduledAt: data.scheduledAt,
        isSent: false,
        createdById: creator.id,
        filterDepts: data.allEmployees ? undefined : {
          create: data.departmentIds.map(id => ({ departmentId: id }))
        },
        filterStores: data.allEmployees ? undefined : {
          create: data.storeIds.map(id => ({ storeId: id }))
        },
        filterShifts: data.allEmployees ? undefined : {
          create: data.shiftIds.map(id => ({ shiftId: id }))
        },
        filterUsers: data.allEmployees ? undefined : {
          create: data.userIds.map(id => ({ userId: id }))
        },
      }
    })

    // TODO (future): when the send-broadcasts cron is scheduled on the VPS (Dokploy),
    // change this block to only call deliverBroadcast when scheduledAt is null,
    // and let the cron handle scheduled ones:
    //
    //   if (!data.scheduledAt) {
    //     await deliverBroadcast(broadcast.id, data.allEmployees)
    //   }
    //
    // For now: always send immediately regardless of scheduledAt.
    await deliverBroadcast(broadcast.id, data.allEmployees)

    revalidatePath('/hrd/broadcast')
    return { success: true, broadcastId: broadcast.id }
  } catch (error: any) {
    console.error('createBroadcast error:', error)
    return { success: false, error: 'Gagal membuat broadcast.' }
  }
}

