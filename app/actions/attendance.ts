'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getDistanceInMeters } from '@/lib/utils/geo'

function getTodayUTCForWIB(): Date {
  const yyyyMmDd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  return new Date(`${yyyyMmDd}T00:00:00Z`)
}

/**
 * Gets today's attendance record for a user.
 */
export async function getTodayAttendance(userId: string) {
  const today = getTodayUTCForWIB()

  const record = await prisma.attendance.findFirst({
    where: {
      userId,
      date: today
    }
  })

  return record
}

/**
 * Helper to parse HH:mm into a Date object for today in WIB
 */
function parseTimeStr(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':')
  const yyyyMmDd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(baseDate)
  return new Date(`${yyyyMmDd}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+07:00`)
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
    const today = getTodayUTCForWIB()
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

      // Anomaly Check: Is this device used by another user?
      const otherUsers = await prisma.userDevice.findMany({
        where: {
          deviceId: data.deviceId,
          userId: { not: data.userId }
        }
      })

      if (otherUsers.length > 0) {
        // Prevent spamming by checking if flag already exists today
        const existingFlag = await prisma.attentionFlag.findFirst({
          where: {
            userId: data.userId,
            type: 'anomaly_checkin',
            description: { contains: data.deviceId },
            createdAt: { gte: today }
          }
        })
        
        if (!existingFlag) {
          await prisma.attentionFlag.create({
            data: {
              userId: data.userId,
              type: 'anomaly_checkin',
              description: `PERHATIAN: Karyawan login menggunakan perangkat (Device ID: ${data.deviceId.substring(0, 8)}...) yang juga digunakan oleh pengguna lain. Indikasi titip absen.`,
            }
          })
        }
      }
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
      include: { shift: true }
    })

    if (!user || !user.shift) {
      return { success: false, error: 'Shift Anda tidak ditemukan. Hubungi HRD.' }
    }

    let shiftStart = parseTimeStr(shift.startTime, now)
    let shiftEnd = parseTimeStr(shift.endTime, now)

    // 4. Check for Approved Leaves today
    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        userId: data.userId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today }
      }
    })

    if (approvedLeave) {
      if (['ANNUAL_LEAVE', 'SICK', 'PERSONAL'].includes(approvedLeave.type)) {
        return { success: false, error: `Anda tidak bisa absen karena Anda sedang Izin/Cuti/Sakit.` }
      }
      if (approvedLeave.type === 'HALF_DAY') {
        if (approvedLeave.halfDayType === 'LATE_IN' && approvedLeave.halfDayTime) {
          shiftStart = parseTimeStr(approvedLeave.halfDayTime, now)
        } else if (approvedLeave.halfDayType === 'EARLY_OUT' && approvedLeave.halfDayTime) {
          shiftEnd = parseTimeStr(approvedLeave.halfDayTime, now)
        }
      }
    }

    // 5. Check for Approved Overtime today
    const approvedOvertime = await prisma.overtimeRequest.findFirst({
      where: {
        userId: data.userId,
        status: 'APPROVED',
        overtimeDate: today
      }
    })

    // Check existing record
    const existing = await prisma.attendance.findFirst({
      where: { userId: data.userId, date: today }
    })

    if (!existing) {
      // --- CHECK-IN LOGIC ---
      const checkinWindowMin = shift.checkinWindowMin === 15 ? 30 : shift.checkinWindowMin
      const checkinOpenTime = new Date(shiftStart.getTime() - checkinWindowMin * 60000)
      const checkinCloseTime = new Date(shiftStart.getTime() + shift.checkinWindowEndMin * 60000)

      if (now < checkinOpenTime) {
        return { success: false, error: `Belum waktunya check-in. Check-in dibuka jam ${checkinOpenTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}` }
      }
      if (now > checkinCloseTime) {
        // Forgot Check-in -> Convert to Check-out
        const record = await prisma.attendance.create({
          data: {
            userId: data.userId,
            storeId: data.storeId,
            date: today,
            checkOutTime: now,
            checkOutLat: data.lat,
            checkOutLng: data.lng,
            checkOutDistance: distance,
            checkOutPhotoUrl: data.photoUrl,
            status: 'FORGOT_CHECKIN',
            isForgotCheckin: true,
            lateMinutes: 0
          }
        })

        await prisma.attentionFlag.create({
          data: {
            userId: data.userId,
            type: 'forgot_checkin',
            description: `Karyawan lupa check-in dan baru check-out pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}`,
            relatedId: record.id
          }
        })
        revalidatePath('/attendance')
        return { success: true, data: record, type: 'check-out' }
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
      let checkoutCloseTime = new Date(shiftEnd.getTime() + 55 * 60000) // Max 55 mins pass end time
      if (approvedOvertime && approvedOvertime.endTime) {
        // Extend max checkout time if overtime exists
        checkoutCloseTime = new Date(approvedOvertime.endTime.getTime() + 55 * 60000)
      }

      if (now > checkoutCloseTime) {
        return { success: false, error: 'Batas waktu check-out telah lewat (maksimal 55 menit setelah shift berakhir atau lembur usai).' }
      }

      // We enforce the early checkout warning in the UI, but we still allow it on the server (logged as anomaly)
      const earlyCheckoutThreshold = new Date(shiftEnd.getTime()) // Warning if before exact shift end

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
            description: `Karyawan melakukan check-out lebih awal pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}`,
            relatedId: existing.id
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
