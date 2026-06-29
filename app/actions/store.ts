'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getStores() {
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
    revalidatePath('/hrd/stores')
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
    const store = await prisma.store.update({
      where: { id },
      data
    })
    revalidatePath('/hrd/stores')
    return { success: true, data: store }
  } catch (error) {
    console.error('Error updating store:', error)
    return { success: false, error: 'Failed to update store' }
  }
}

export async function deleteStore(id: string) {
  try {
    await prisma.store.delete({
      where: { id }
    })
    revalidatePath('/hrd/stores')
    return { success: true }
  } catch (error) {
    console.error('Error deleting store:', error)
    return { success: false, error: 'Failed to delete store' }
  }
}
