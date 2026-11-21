import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ATTENDANCE_RULES,
  DEFAULT_LEAVE_TYPES,
  annualLeaveQuota,
  checkoutDeadline,
  isLeaveDayPaid,
  lateThreshold,
  leaveTypeRules,
  pickAttendanceRules,
  type AttendancePolicyRow,
} from './resolve'

function row(effectiveFrom: string, over: Partial<AttendancePolicyRow> = {}): AttendancePolicyRow {
  return {
    id: `p-${over.storeId ?? 'global'}-${effectiveFrom}`,
    storeId: null,
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00Z`), // @db.Date
    ...DEFAULT_ATTENDANCE_RULES,
    ...over,
  }
}

describe('starting values (regression: same numbers as the code before Sprint 2)', () => {
  it('keeps the old attendance numbers', () => {
    expect(DEFAULT_ATTENDANCE_RULES).toEqual({
      lateToleranceMin: 0,
      checkoutGraceMin: 55,
      rainyGraceMin: 60,
      latePenalty: 20000,
      forgotPenalty: 20000,
    })
  })

  it('keeps the old leave rules', () => {
    expect(annualLeaveQuota([])).toBe(12)
    expect(DEFAULT_LEAVE_TYPES.SICK).toMatchObject({ attachmentDays: 3, paidOnlyWithAttachment: true, deductsQuota: false })
    expect(DEFAULT_LEAVE_TYPES.ANNUAL_LEAVE).toMatchObject({ deductsQuota: true, isPaid: true })
    expect(DEFAULT_LEAVE_TYPES.PERSONAL.isPaid).toBe(false)
  })
})

describe('pickAttendanceRules', () => {
  it('falls back to the defaults when there is no row', () => {
    expect(pickAttendanceRules([], 'store-a', '2026-11-21')).toMatchObject({ source: 'DEFAULT', checkoutGraceMin: 55 })
  })

  it('uses the newest global row in effect', () => {
    const rows = [row('2020-01-01'), row('2026-11-01', { checkoutGraceMin: 60 })]
    expect(pickAttendanceRules(rows, 'store-a', '2026-11-21')).toMatchObject({ source: 'GLOBAL', checkoutGraceMin: 60, effectiveFrom: '2026-11-01' })
    expect(pickAttendanceRules(rows, 'store-a', '2026-10-31').checkoutGraceMin).toBe(55)
  })

  it('does nothing today for a change dated in the future', () => {
    const rows = [row('2020-01-01'), row('2026-12-01', { latePenalty: 25000 })]
    expect(pickAttendanceRules(rows, null, '2026-11-30').latePenalty).toBe(20000)
    expect(pickAttendanceRules(rows, null, '2026-12-01').latePenalty).toBe(25000)
  })

  it('lets a store row replace the global row for that store only', () => {
    const rows = [row('2020-01-01'), row('2026-11-10', { storeId: 'store-b', rainyGraceMin: 90 })]
    expect(pickAttendanceRules(rows, 'store-b', '2026-11-21')).toMatchObject({ source: 'STORE', rainyGraceMin: 90 })
    expect(pickAttendanceRules(rows, 'store-a', '2026-11-21')).toMatchObject({ source: 'GLOBAL', rainyGraceMin: 60 })
    expect(pickAttendanceRules(rows, 'store-b', '2026-11-09').source).toBe('GLOBAL') // before the store row
  })
})

describe('attendance time rules', () => {
  const start = new Date('2026-11-21T01:00:00Z') // 08:00 WIB
  const end = new Date('2026-11-21T10:00:00Z') // 17:00 WIB

  it('is late right after shift start by default, 60 minutes later on a rainy day', () => {
    expect(lateThreshold(start, DEFAULT_ATTENDANCE_RULES, false).toISOString()).toBe('2026-11-21T01:00:00.000Z')
    expect(lateThreshold(start, DEFAULT_ATTENDANCE_RULES, true).toISOString()).toBe('2026-11-21T02:00:00.000Z')
  })

  it('adds the late tolerance on top of the rainy grace', () => {
    const rules = { ...DEFAULT_ATTENDANCE_RULES, lateToleranceMin: 10 }
    expect(lateThreshold(start, rules, false).toISOString()).toBe('2026-11-21T01:10:00.000Z')
    expect(lateThreshold(start, rules, true).toISOString()).toBe('2026-11-21T02:10:00.000Z')
  })

  it('allows check-out until 55 minutes after the shift or the approved overtime ends', () => {
    expect(checkoutDeadline(end, null, DEFAULT_ATTENDANCE_RULES).toISOString()).toBe('2026-11-21T10:55:00.000Z')
    const otEnd = new Date('2026-11-21T12:00:00Z') // 19:00 WIB
    expect(checkoutDeadline(end, otEnd, DEFAULT_ATTENDANCE_RULES).toISOString()).toBe('2026-11-21T12:55:00.000Z')
    expect(checkoutDeadline(end, null, { ...DEFAULT_ATTENDANCE_RULES, checkoutGraceMin: 60 }).toISOString()).toBe('2026-11-21T11:00:00.000Z')
  })
})

describe('leave types', () => {
  it('prefers the stored row over the default', () => {
    const stored = { ...DEFAULT_LEAVE_TYPES.SICK, attachmentDays: 5 }
    expect(leaveTypeRules([stored], 'SICK').attachmentDays).toBe(5)
    expect(leaveTypeRules([], 'SICK').attachmentDays).toBe(3)
  })

  it('treats an unknown type as paid with no limits', () => {
    expect(leaveTypeRules([], 'BEREAVEMENT')).toMatchObject({ isPaid: true, deductsQuota: false, maxDaysPerRequest: null })
  })

  it('reads the quota from the type that deducts it', () => {
    expect(annualLeaveQuota([{ ...DEFAULT_LEAVE_TYPES.ANNUAL_LEAVE, annualQuotaDays: 14 }])).toBe(14)
  })

  it('decides whether a leave day is paid', () => {
    expect(isLeaveDayPaid(DEFAULT_LEAVE_TYPES.ANNUAL_LEAVE, { isPaid: true })).toBe(true)
    expect(isLeaveDayPaid(DEFAULT_LEAVE_TYPES.PERSONAL, { isPaid: true })).toBe(false)
    expect(isLeaveDayPaid(DEFAULT_LEAVE_TYPES.SICK, { isPaid: false })).toBe(false) // no doctor's note
    expect(isLeaveDayPaid(DEFAULT_LEAVE_TYPES.SICK, { isPaid: true })).toBe(true)
  })
})
