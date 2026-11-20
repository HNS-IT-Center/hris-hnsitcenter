'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getScheduleForDay, type DaySchedule } from '@/lib/schedule'
import { getDistanceInMeters } from '@/lib/utils/geo'
import { requireSelfOrPrivileged, requireUser } from '@/lib/auth/guards'
import { HRD_AUDIENCE, formatDay, notify } from '@/lib/notify'

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Hadir',
  LATE: 'Terlambat',
  ALPHA: 'Alpha',
  ON_LEAVE: 'Izin/Cuti',
  TIDAK_ABSEN: 'Tidak Absen',
  FORGOT_CHECKIN: 'Lupa Check-in',
  FORGOT_CHECKOUT: 'Lupa Check-out',
  HOLIDAY: 'Libur',
}

function wibTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}

function getTodayUTCForWIB(): Date {
  const yyyyMmDd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  return new Date(`${yyyyMmDd}T00:00:00Z`)
}

/**
 * Gets today's attendance record for a user.
 */
export async function getTodayAttendance(userId: string) {
  await requireSelfOrPrivileged(userId)
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
 * Check-in on a holiday or a day off is allowed (stores may need people), but
 * HRD has to know: one attention flag and one notification, unless an approved
 * overtime covers the day. Not exported: exports of this file are server actions.
 */
async function flagOffDayAttendance(
  schedule: DaySchedule,
  hasApprovedOvertime: boolean,
  attendanceId: string,
  employeeName: string,
  now: Date,
) {
  if (hasApprovedOvertime) return
  if (schedule.status !== 'HOLIDAY' && schedule.status !== 'OFF') return
  const dayLabel = schedule.status === 'HOLIDAY'
    ? `hari libur (${schedule.holiday?.name ?? 'Libur'})`
    : 'hari liburnya (libur mingguan atau roster)'
  await prisma.attentionFlag.create({
    data: {
      userId: schedule.userId,
      type: 'overtime_holiday',
      description: `Karyawan absen pada ${dayLabel} pukul ${wibTime(now)} tanpa lembur yang disetujui.`,
      relatedId: attendanceId,
    }
  })
  await notify(
    { roles: HRD_AUDIENCE },
    {
      category: 'ATTENDANCE',
      title: 'Absen di Hari Libur',
      body: `${employeeName} absen pada ${dayLabel} pukul ${wibTime(now)} tanpa lembur yang disetujui.`,
      url: '/hrd/anomalies',
    }
  )
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
  deviceName?: string   // Marketing name collected client-side (e.g. "Oppo Reno 14 5G")
}) {
  try {
    // Never trust identity or location target from the browser: the attendance
    // is always for the session user, at the store HRD assigned to them.
    const me = await requireUser()
    const assigned = await prisma.user.findUnique({ where: { id: me.id }, select: { storeId: true } })
    if (!assigned?.storeId) {
      return { success: false, error: 'Anda belum ditugaskan ke lokasi/toko manapun. Hubungi HRD.' }
    }
    data = { ...data, userId: me.id, storeId: assigned.storeId }

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
        },
        include: { user: true },
        orderBy: { lastUsedAt: 'asc' }
      })

      if (otherUsers.length > 0) {
        // Build a human-readable device string for the attention flag.
        // Priority: (1) marketing name from client-side userAgentData,
        //           (2) model from ua-parser-js,
        //           (3) OS + Browser fallback,
        //           (4) partial Device ID.
        let deviceStr = `Device ID: ${data.deviceId.substring(0, 8)}...`

        if (data.deviceName) {
          // Best case: client sent the real marketing model name
          deviceStr = data.deviceName
        } else if (data.userAgent) {
          try {
            const { UAParser } = require('ua-parser-js')
            const parser = new UAParser(data.userAgent)
            const result = parser.getResult()
            const deviceModel = result.device.model
            const deviceVendor = result.device.vendor
            if (deviceModel && deviceModel.length > 1) {
              // Only use model if it's not a single-letter code like "K"
              deviceStr = `${deviceVendor ? deviceVendor + ' ' : ''}${deviceModel}`
            } else {
              const os = result.os.name
              const browser = result.browser.name
              if (os || browser) {
                deviceStr = `${os || 'Unknown OS'} - ${browser || 'Unknown Browser'}`
              }
            }
          } catch {
            // fallback if parser fails — keep Device ID string
          }
        }

        const existingFlag = await prisma.attentionFlag.findFirst({
          where: {
            userId: data.userId,
            type: 'anomaly_checkin',
            description: { contains: deviceStr },
            createdAt: { gte: today }
          }
        })
        
        if (!existingFlag) {
          const otherUserName = otherUsers[0].user.name
          await prisma.attentionFlag.create({
            data: {
              userId: data.userId,
              type: 'anomaly_checkin',
              description: `PERHATIAN: Karyawan login menggunakan perangkat (${deviceStr}) yang juga digunakan oleh ${otherUserName} (yang absen menggunakan perangkat ini lebih awal). Indikasi titip absen.`,
            }
          })
          await notify(
            { roles: HRD_AUDIENCE },
            {
              category: 'ATTENDANCE',
              title: 'Indikasi Titip Absen',
              body: `${me.name} absen dari perangkat yang juga dipakai ${otherUserName} hari ini.`,
              url: '/hrd/anomalies',
              email: true,
            }
          )
        }
      }
    }

    // 2. Geofence Check
    let distance = 0
    let storeData = null
    if (data.storeId) {
      storeData = await prisma.store.findUnique({ where: { id: data.storeId } })
      if (!storeData) {
        return { success: false, error: 'Lokasi toko Anda tidak ditemukan. Hubungi HRD.' }
      }
      if (storeData) {
        distance = getDistanceInMeters(data.lat, data.lng, storeData.latitude, storeData.longitude)
        if (distance > storeData.radiusMeters) {
          return { success: false, error: `Lokasi Anda berada di luar radius toko (${storeData.radiusMeters} meter).` }
        }
      }
    }

    // 3. Today's schedule from the resolver (lib/schedule): shift of the day
    //    (rotation or roster), holiday, approved leave and half days.
    const schedule = await getScheduleForDay(data.userId, today)

    if (schedule?.status === 'LEAVE') {
      return { success: false, error: `Anda tidak bisa absen karena Anda sedang Izin/Cuti/Sakit.` }
    }
    if (!schedule?.shift || !schedule.startTime || !schedule.endTime) {
      return { success: false, error: 'Shift Anda tidak ditemukan. Hubungi HRD.' }
    }

    const shift = schedule.shift
    const shiftStart = parseTimeStr(schedule.startTime, now)
    const shiftEnd = parseTimeStr(schedule.endTime, now)

    // 4. Check for Approved Overtime today
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
        await notify(
          { userIds: [data.userId] },
          {
            category: 'ATTENDANCE',
            title: 'Absen Pulang Tercatat (Lupa Check-in)',
            body: `Absen pulang pukul ${wibTime(now)} tercatat, tetapi tidak ada absen masuk hari ini. Status ditandai Lupa Check-in.`,
            url: '/performance',
          }
        )
        await notify(
          { roles: HRD_AUDIENCE },
          {
            category: 'ATTENDANCE',
            title: 'Karyawan Lupa Check-in',
            body: `${me.name} baru absen pulang pukul ${wibTime(now)} tanpa absen masuk.`,
            url: '/hrd/anomalies',
          }
        )
        await flagOffDayAttendance(schedule, !!approvedOvertime, record.id, me.name, now)
        revalidatePath('/attendance')
        return { success: true, data: record, type: 'check-out' }
      }

      // --- Rainy Day Grace Period ---
      // If today is a rainy day for this employee (Holiday row with isRainyDay,
      // for everyone, their store or department), lateness starts +60 minutes later.
      const isRainyDay = schedule.isRainyDay
      const effectiveShiftStart = isRainyDay ? new Date(shiftStart.getTime() + 60 * 60000) : shiftStart

      let status: 'PRESENT' | 'LATE' = 'PRESENT'
      let lateMinutes = 0

      if (now > effectiveShiftStart) {
        status = 'LATE'
        // Late minutes counted from the original shift start, not the grace window
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
          lateMinutes,
          isRainyDay,
        }
      })
      await notify(
        { userIds: [data.userId] },
        {
          category: 'ATTENDANCE',
          title: 'Absen Masuk Tercatat',
          body: status === 'LATE'
            ? `Absen masuk pukul ${wibTime(now)} di ${storeData?.name ?? 'lokasi Anda'}. Terlambat ${lateMinutes} menit.`
            : `Absen masuk pukul ${wibTime(now)} di ${storeData?.name ?? 'lokasi Anda'}. Tepat waktu.`,
          url: '/attendance',
        }
      )
      await flagOffDayAttendance(schedule, !!approvedOvertime, record.id, me.name, now)
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
        await notify(
          { roles: HRD_AUDIENCE },
          {
            category: 'ATTENDANCE',
            title: 'Check-out Lebih Awal',
            body: `${me.name} absen pulang pukul ${wibTime(now)}, sebelum shift berakhir.`,
            url: '/hrd/anomalies',
          }
        )
      }

      await notify(
        { userIds: [data.userId] },
        {
          category: 'ATTENDANCE',
          title: 'Absen Pulang Tercatat',
          body: `Absen pulang pukul ${wibTime(now)}.${now < earlyCheckoutThreshold ? ' Tercatat pulang sebelum shift berakhir.' : ' Terima kasih atas kerja Anda hari ini.'}`,
          url: '/attendance',
        }
      )

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

/**
 * HRD/Boss Override Attendance Status (Dispensasi)
 * Works for both existing records and past dates with no record (Tidak Absen case).
 */
export async function overrideAttendance(
  params: {
    attendanceId?: string      // If we already have a record
    userId?: string            // Required when attendanceId is missing
    date?: string              // ISO date string "YYYY-MM-DD" (WIB), required when attendanceId is missing
  },
  newStatus: 'PRESENT' | 'LATE' | 'ALPHA' | 'ON_LEAVE' | 'TIDAK_ABSEN' | 'FORGOT_CHECKIN' | 'FORGOT_CHECKOUT',
  reason: string
) {
  try {
    const { getServerUser } = await import('@/lib/auth')
    const ssoAdmin = await getServerUser()
    if (!ssoAdmin) return { success: false, error: 'Unauthorized.' }

    const admin = await prisma.user.findUnique({ where: { email: ssoAdmin.email } })
    if (!admin || (admin.role !== 'HRD' && admin.role !== 'BOSS' && admin.role !== 'ADMIN')) {
      return { success: false, error: 'Unauthorized.' }
    }

    if (!reason || reason.trim() === '') {
      return { success: false, error: 'Alasan dispensasi wajib diisi.' }
    }

    // --- Determine the target record ---
    let existingId: string | null = null

    if (params.attendanceId) {
      existingId = params.attendanceId
    } else if (params.userId && params.date) {
      // Build the UTC midnight date for that WIB calendar day
      const dateUTC = new Date(`${params.date}T00:00:00Z`)
      const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId: params.userId, date: dateUTC } }
      })
      existingId = existing?.id ?? null
    }

    if (existingId) {
      // --- UPDATE existing record ---
      const record = await prisma.attendance.findUnique({ where: { id: existingId } })
      if (!record) return { success: false, error: 'Data absensi tidak ditemukan.' }

      let penaltyAmount = record.penaltyAmount
      let lateMinutes = record.lateMinutes
      if (newStatus === 'PRESENT') {
        penaltyAmount = 0
        lateMinutes = 0
      } else if (newStatus === 'LATE') {
        penaltyAmount = 20000
      }

      await prisma.attendance.update({
        where: { id: existingId },
        data: {
          status: newStatus,
          isOverridden: true,
          overrideReason: reason,
          overriddenById: admin.id,
          penaltyAmount,
          lateMinutes,
        }
      })
      await notify(
        { userIds: [record.userId] },
        {
          category: 'ATTENDANCE',
          title: 'Absensi Anda Dikoreksi HRD',
          body: `Status absensi ${formatDay(record.date)} diubah menjadi ${STATUS_LABELS[newStatus] ?? newStatus}. Alasan: ${reason}`,
          url: '/performance',
        }
      )
    } else if (params.userId && params.date) {
      // --- CREATE a new record for a past date that had no check-in at all ---
      const dateUTC = new Date(`${params.date}T00:00:00Z`)
      await prisma.attendance.create({
        data: {
          userId: params.userId,
          date: dateUTC,
          status: newStatus,
          isOverridden: true,
          overrideReason: reason,
          overriddenById: admin.id,
          penaltyAmount: 0,
          lateMinutes: 0,
        }
      })
      await notify(
        { userIds: [params.userId] },
        {
          category: 'ATTENDANCE',
          title: 'Absensi Anda Dikoreksi HRD',
          body: `Status absensi ${formatDay(dateUTC)} ditetapkan ${STATUS_LABELS[newStatus] ?? newStatus}. Alasan: ${reason}`,
          url: '/performance',
        }
      )
    } else {
      return { success: false, error: 'Informasi absensi tidak cukup untuk melakukan override.' }
    }

    revalidatePath('/hrd/attendance')
    return { success: true }
  } catch (error) {
    console.error('Error overriding attendance:', error)
    return { success: false, error: 'Gagal meng-override data absensi.' }
  }
}

