'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getDistanceInMeters } from '@/lib/utils/geo'

/**
 * Gets today's attendance record for a user.
 */
export async function getTodayAttendance(userId: string) {
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
 * Helper to parse HH:mm into a Date object for today
 */
function parseTimeStr(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const d = new Date(baseDate)
  d.setHours(hours, minutes, 0, 0)
  return d
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
  deviceId: string
  userAgent?: string
}) {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const now = new Date()

    // 1. Device Fingerprinting & Blocking Check
    if (data.deviceId) {
      let device = await prisma.userDevice.findUnique({
        where: {
          userId_deviceId: {
            userId: data.userId,
            deviceId: data.deviceId
          }
        }
      })

      if (device && device.isBlocked) {
        return { success: false, error: 'Akun Anda diblokir untuk melakukan absensi dari perangkat ini.' }
      }

      await prisma.userDevice.upsert({
        where: {
          userId_deviceId: {
            userId: data.userId,
            deviceId: data.deviceId
          }
        },
        update: {
          lastUsedAt: now,
          userAgent: data.userAgent
        },
        create: {
          userId: data.userId,
          deviceId: data.deviceId,
          userAgent: data.userAgent,
          lastUsedAt: now,
          isBlocked: false
        }
      })
    }

    // 2. Geofence Check
    let distance = 0
    let storeData = null
    if (data.storeId) {
      storeData = await prisma.store.findUnique({ where: { id: data.storeId } })
      if (storeData) {
        distance = getDistanceInMeters(data.lat, data.lng, storeData.latitude, storeData.longitude)
        if (distance > storeData.radiusMeters) {
          return { success: false, error: `Lokasi Anda berada di luar radius toko (${storeData.radiusMeters} meter).` }
        }
      }
    }

    // 3. Fetch User's Shift
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { primaryShift: true }
    })

    if (!user || !user.primaryShift) {
      return { success: false, error: 'Shift Anda tidak ditemukan. Hubungi HRD.' }
    }

    const shift = user.primaryShift
    const shiftStart = parseTimeStr(shift.startTime, now)
    const shiftEnd = parseTimeStr(shift.endTime, now)

    // Check existing record
    const existing = await prisma.attendance.findFirst({
      where: { userId: data.userId, date: today }
    })

    if (!existing) {
      // --- CHECK-IN LOGIC ---
      const checkinOpenTime = new Date(shiftStart.getTime() - shift.checkinWindowMin * 60000)
      const checkinCloseTime = new Date(shiftStart.getTime() + shift.checkinWindowEndMin * 60000)

      if (now < checkinOpenTime) {
        return { success: false, error: `Belum waktunya check-in. Check-in dibuka jam ${checkinOpenTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` }
      }
      if (now > checkinCloseTime) {
        return { success: false, error: 'Waktu check-in telah ditutup.' }
      }

      let status: 'PRESENT' | 'LATE' = 'PRESENT'
      let lateMinutes = 0

      if (now > shiftStart) {
        status = 'LATE'
        lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
      }

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
          status,
          lateMinutes
        }
      })
      revalidatePath('/attendance')
      return { success: true, data: record, type: 'check-in' }

    } else if (!existing.checkOutTime) {
      // --- CHECK-OUT LOGIC ---
      const checkoutCloseTime = new Date(shiftEnd.getTime() + 55 * 60000) // Max 55 mins pass end time
      const earlyCheckoutThreshold = new Date(shiftEnd.getTime() - 30 * 60000) // 30 mins before end

      if (now > checkoutCloseTime) {
        return { success: false, error: 'Batas waktu check-out telah lewat (maksimal 55 menit setelah shift).' }
      }

      let isAnomaly = existing.isAnomaly
      let anomalyNote = existing.anomalyNote

      if (now < earlyCheckoutThreshold) {
        isAnomaly = true
        anomalyNote = anomalyNote ? `${anomalyNote} | Early Checkout` : 'Early Checkout'
      }

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          checkOutLat: data.lat,
          checkOutLng: data.lng,
          checkOutDistance: distance,
          checkOutPhotoUrl: data.photoUrl,
          isAnomaly,
          anomalyNote
        }
      })
      
      // Also potentially generate a flag if it's an anomaly (Optional: we can leave it to the UI or create the flag here)
      if (now < earlyCheckoutThreshold) {
        await prisma.attentionFlag.create({
          data: {
            userId: data.userId,
            type: 'anomaly_checkin',
            description: `Karyawan melakukan check-out lebih awal pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
            date: today
          }
        })
      }

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
