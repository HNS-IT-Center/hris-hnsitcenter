'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getDistanceInMeters } from '@/lib/utils/geo'

/**
 * Gets today's attendance record for a user.
 */
export async function getTodayAttendance(userId: string) {
  // We need to fetch for today's date in WIB, but stored in UTC at midnight.
  // For simplicity, let's find the latest record for today.
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const record = await prisma.attendance.findFirst({
    where: {
      userId,
      date: today
    }
  })

  return record
}

/**
 * Submits an attendance (Check-in or Check-out).
 */
export async function submitAttendance(data: {
  userId: string
  storeId?: string | null
  lat: number
  lng: number
  photoUrl: string
}) {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const now = new Date()

    let distance = 0
    let storeData = null

    // Calculate distance securely on the server
    if (data.storeId) {
      storeData = await prisma.store.findUnique({ where: { id: data.storeId } })
      if (storeData) {
        distance = getDistanceInMeters(data.lat, data.lng, storeData.latitude, storeData.longitude)
        
        // Enforce geofencing on server
        if (distance > storeData.radiusMeters) {
          return { success: false, error: 'Lokasi Anda berada di luar radius toko yang diizinkan.' }
        }
      }
    }

    // Check existing record
    const existing = await prisma.attendance.findFirst({
      where: { userId: data.userId, date: today }
    })

    if (!existing) {
      // Create Check-in
      const record = await prisma.attendance.create({
        data: {
          userId: data.userId,
          storeId: data.storeId,
          date: today,
          checkInTime: now,
          checkInLat: data.lat,
          checkInLng: data.lng,
          checkInDistance: distance,
          checkInPhotoUrl: data.photoUrl,
          status: 'PRESENT'
        }
      })
      revalidatePath('/attendance')
      return { success: true, data: record, type: 'check-in' }
    } else if (!existing.checkOutTime) {
      // Update Check-out
      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          checkOutLat: data.lat,
          checkOutLng: data.lng,
          checkOutDistance: distance,
          checkOutPhotoUrl: data.photoUrl
        }
      })
      revalidatePath('/attendance')
      return { success: true, data: record, type: 'check-out' }
    } else {
      return { success: false, error: 'Anda sudah melakukan check-in dan check-out hari ini.' }
    }
  } catch (error) {
    console.error('Error submitting attendance:', error)
    return { success: false, error: 'Terjadi kesalahan pada server saat mengirim absensi.' }
  }
}
