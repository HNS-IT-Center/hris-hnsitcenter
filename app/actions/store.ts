'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requirePrivileged } from '@/lib/auth/guards'
import { notify } from '@/lib/notify'

export async function getStores() {
  await requirePrivileged()
  return await prisma.store.findMany({
    orderBy: {
      name: 'asc'
    }
  })
}

export async function createStore(data: {
  name: string
  address?: string
  latitude?: number
  longitude?: number
  openTime?: string
  closeTime?: string
  radiusMeters?: number
}) {
  try {
    await requirePrivileged()
    const store = await prisma.store.create({
      data: {
        name: data.name,
        address: data.address,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        openTime: data.openTime,
        closeTime: data.closeTime,
        radiusMeters: data.radiusMeters || 150
      }
    })
    revalidatePath('/hrd/pengaturan-absensi')
    return { success: true, data: store }
  } catch (error) {
    console.error('Error creating store:', error)
    return { success: false, error: 'Failed to create store' }
  }
}

export async function updateStore(id: string, data: {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  openTime?: string
  closeTime?: string
  radiusMeters?: number
}) {
  try {
    await requirePrivileged()
    const before = await prisma.store.findUnique({ where: { id } })
    const store = await prisma.store.update({
      where: { id },
      data
    })
    revalidatePath('/hrd/pengaturan-absensi')
    const moved = !!before && (before.latitude !== store.latitude || before.longitude !== store.longitude || before.radiusMeters !== store.radiusMeters)
    const hoursChanged = !!before && (before.openTime !== store.openTime || before.closeTime !== store.closeTime)
    if (moved || hoursChanged) {
      const users = await prisma.user.findMany({ where: { storeId: id, isActive: true }, select: { id: true } })
      await notify(
        { userIds: users.map((u) => u.id) },
        {
          category: 'ATTENDANCE',
          title: `Lokasi Absen ${store.name} Diperbarui`,
          body: moved
            ? `Titik lokasi atau radius absen ${store.name} telah diubah HRD (radius ${store.radiusMeters} m).`
            : `Jam operasional ${store.name} sekarang ${store.openTime ?? '-'} - ${store.closeTime ?? '-'}.`,
          url: '/attendance',
        }
      )
    }
    return { success: true, data: store }
  } catch (error) {
    console.error('Error updating store:', error)
    return { success: false, error: 'Failed to update store' }
  }
}

export async function deleteStore(id: string) {
  try {
    await requirePrivileged()
    await prisma.store.delete({
      where: { id }
    })
    revalidatePath('/hrd/pengaturan-absensi')
    return { success: true }
  } catch (error) {
    console.error('Error deleting store:', error)
    return { success: false, error: 'Failed to delete store' }
  }
}
