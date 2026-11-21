import { describe, expect, it } from 'vitest'
import { dateKeyRange, wibDayToUTC } from '@/lib/utils/date'
import {
  countScheduledWorkDays,
  resolveDay,
  rotationShiftId,
  type ScheduleHoliday,
  type ScheduleLeave,
  type ScheduleOverride,
  type ScheduleShift,
  type ScheduleUser,
} from './resolve'

// Calendar used below (WIB): Mon 23 Nov 2026 ... Sun 29 Nov, Mon 30 Nov, Tue 1 Dec.

const shift = (id: string, startTime: string, endTime: string): ScheduleShift => ({
  id,
  name: id,
  startTime,
  endTime,
  checkinWindowMin: 30,
  checkinWindowEndMin: 240,
  halfDayEndTime: '14:00',
})
const PAGI = shift('pagi', '08:00', '17:00')
const SIANG = shift('siang', '13:00', '22:00')
const MALAM = shift('malam', '21:00', '06:00')
const shifts = new Map([PAGI, SIANG, MALAM].map((s) => [s.id, s]))

function user(over: Partial<ScheduleUser> = {}): ScheduleUser {
  return {
    id: 'u1',
    shiftId: PAGI.id,
    weeklyOffDays: [0], // Sunday
    halfDays: [],
    shiftCycle: [],
    cycleStartDate: null,
    storeId: 'store-a',
    departmentId: 'dept-sales',
    departmentName: 'Sales',
    ...over,
  }
}

function holiday(date: string, over: Partial<ScheduleHoliday> = {}): ScheduleHoliday {
  return {
    id: `h-${date}`,
    date: new Date(`${date}T00:00:00Z`), // Holiday.date is @db.Date
    name: 'Libur Nasional',
    scope: 'ALL',
    storeId: null,
    departmentId: null,
    departmentName: null,
    isRainyDay: false,
    ...over,
  }
}

/** Leave dates as the leave form sends them: the browser's WIB midnight (17:00Z the day before). */
function leave(type: string, from: [number, number, number], to: [number, number, number], over: Partial<ScheduleLeave> = {}): ScheduleLeave {
  return {
    id: `l-${type}`,
    userId: 'u1',
    type,
    startDate: wibDayToUTC(...from),
    endDate: wibDayToUTC(...to),
    halfDayType: null,
    halfDayTime: null,
    isPaid: true,
    ...over,
  }
}

function override(date: string, over: Partial<ScheduleOverride>): ScheduleOverride {
  return {
    id: `o-${date}`,
    userId: 'u1',
    date: new Date(`${date}T00:00:00Z`),
    shiftId: null,
    isDayOff: false,
    customStart: null,
    customEnd: null,
    ...over,
  }
}

function resolve(
  date: string,
  opts: {
    user?: ScheduleUser
    leaves?: ScheduleLeave[]
    holidays?: ScheduleHoliday[]
    override?: ScheduleOverride | null
  } = {},
) {
  return resolveDay({
    user: opts.user ?? user(),
    date,
    shifts,
    leaves: opts.leaves ?? [],
    holidays: opts.holidays ?? [],
    override: opts.override ?? null,
  })
}

describe('fixed shift and weekly day off', () => {
  it('works the primary shift on a normal day', () => {
    const d = resolve('2026-11-24')
    expect(d).toMatchObject({ status: 'WORK', source: 'PRIMARY', startTime: '08:00', endTime: '17:00', isHalfDay: false })
    expect(d.shift?.id).toBe('pagi')
  })

  it('is off on the weekly day off, and still knows the shift it would have had', () => {
    const d = resolve('2026-11-29') // Sunday
    expect(d).toMatchObject({ status: 'OFF', source: 'PRIMARY' })
    expect(d.shift?.id).toBe('pagi')
  })

  it('is a working day without times when no shift is assigned', () => {
    expect(resolve('2026-11-24', { user: user({ shiftId: null }) })).toMatchObject({
      status: 'WORK',
      source: 'NONE',
      shift: null,
      startTime: null,
      endTime: null,
    })
  })
})

describe('rotation', () => {
  // The employee form saves the anchor from a browser date picker: WIB midnight of Mon 2 Nov.
  const anchor = wibDayToUTC(2026, 11, 2)

  it('alternates two shifts week by week', () => {
    const u = user({ shiftCycle: ['pagi', 'siang'], cycleStartDate: anchor })
    expect(resolve('2026-11-18', { user: u }).shift?.id).toBe('pagi') // week 3
    const d = resolve('2026-11-25', { user: u }) // week 4
    expect(d).toMatchObject({ status: 'WORK', source: 'ROTATION', startTime: '13:00', endTime: '22:00' })
  })

  it('cycles three shifts, also from a mid-week anchor and before the anchor', () => {
    const cycle = ['pagi', 'siang', 'malam']
    expect(rotationShiftId(cycle, anchor, '2026-11-23')).toBe('pagi')
    expect(rotationShiftId(cycle, anchor, '2026-11-30')).toBe('siang')
    expect(rotationShiftId(cycle, anchor, '2026-12-06')).toBe('siang') // Sunday ends the week
    expect(rotationShiftId(cycle, anchor, '2026-12-07')).toBe('malam')
    expect(rotationShiftId(cycle, wibDayToUTC(2026, 11, 4), '2026-12-07')).toBe('malam') // Wednesday anchor
    expect(rotationShiftId(cycle, anchor, '2026-10-26')).toBe('malam') // one week before
  })

  it('falls back to the primary shift for an empty rotation week', () => {
    const u = user({ shiftCycle: ['none', 'siang'], cycleStartDate: anchor, shiftId: 'pagi' })
    expect(resolve('2026-11-18', { user: u })).toMatchObject({ source: 'PRIMARY', startTime: '08:00' })
  })

  it('keeps the weekly day off during a rotation', () => {
    const u = user({ shiftCycle: ['pagi', 'siang'], cycleStartDate: anchor })
    expect(resolve('2026-11-29', { user: u })).toMatchObject({ status: 'OFF', source: 'ROTATION' })
  })
})

describe('holidays', () => {
  it('makes a national holiday a holiday for everyone', () => {
    const d = resolve('2026-12-25', { holidays: [holiday('2026-12-25', { name: 'Natal' })] })
    expect(d).toMatchObject({ status: 'HOLIDAY', source: 'HOLIDAY', holiday: { name: 'Natal' } })
  })

  it('applies a store holiday only to that store', () => {
    const h = holiday('2026-11-24', { scope: 'STORE', storeId: 'store-b' })
    expect(resolve('2026-11-24', { holidays: [h] }).status).toBe('WORK')
    expect(resolve('2026-11-24', { holidays: [h], user: user({ storeId: 'store-b' }) }).status).toBe('HOLIDAY')
  })

  it('matches a department holiday by name when the user has no department id', () => {
    const h = holiday('2026-11-24', { scope: 'DEPARTMENT', departmentId: 'dept-x', departmentName: 'Sales' })
    expect(resolve('2026-11-24', { holidays: [h], user: user({ departmentId: null }) }).status).toBe('HOLIDAY')
    expect(resolve('2026-11-24', { holidays: [h], user: user({ departmentId: null, departmentName: 'IT' }) }).status).toBe('WORK')
  })

  it('treats a rainy day as a working day with the rainy flag', () => {
    const d = resolve('2026-11-24', { holidays: [holiday('2026-11-24', { isRainyDay: true })] })
    expect(d).toMatchObject({ status: 'WORK', isRainyDay: true, holiday: null })
  })

  it('ignores holidays on other dates', () => {
    expect(resolve('2026-11-24', { holidays: [holiday('2026-11-25')] }).status).toBe('WORK')
  })
})

describe('roster override', () => {
  it('puts the employee on a shift on their weekly day off', () => {
    const d = resolve('2026-11-29', { override: override('2026-11-29', { shiftId: 'siang' }) })
    expect(d).toMatchObject({ status: 'WORK', source: 'OVERRIDE', startTime: '13:00', endTime: '22:00' })
  })

  it('gives a day off on a working day', () => {
    expect(resolve('2026-11-24', { override: override('2026-11-24', { isDayOff: true }) })).toMatchObject({
      status: 'OFF',
      source: 'OVERRIDE',
    })
  })

  it('uses custom hours and skips the weekly half day', () => {
    const u = user({ halfDays: [2] }) // Tuesday
    const o = override('2026-11-24', { shiftId: 'pagi', customStart: '09:00', customEnd: '18:00' })
    expect(resolve('2026-11-24', { user: u, override: o })).toMatchObject({ startTime: '09:00', endTime: '18:00', isHalfDay: false })
  })

  it('loses to a holiday', () => {
    const d = resolve('2026-12-25', { holidays: [holiday('2026-12-25')], override: override('2026-12-25', { shiftId: 'siang' }) })
    expect(d.status).toBe('HOLIDAY')
  })
})

describe('leave', () => {
  const annual = leave('ANNUAL_LEAVE', [2026, 11, 24], [2026, 11, 26])

  it('covers every day of the request, the last day included', () => {
    for (const date of ['2026-11-24', '2026-11-25', '2026-11-26']) {
      expect(resolve(date, { leaves: [annual] })).toMatchObject({ status: 'LEAVE', source: 'LEAVE', leave: { type: 'ANNUAL_LEAVE' } })
    }
    expect(resolve('2026-11-27', { leaves: [annual] }).status).toBe('WORK')
    expect(resolve('2026-11-23', { leaves: [annual] }).status).toBe('WORK')
  })

  it('does not use up a weekly day off or a holiday', () => {
    const sick = leave('SICK', [2026, 11, 28], [2026, 12, 1])
    expect(resolve('2026-11-29', { leaves: [sick] }).status).toBe('OFF')
    expect(resolve('2026-11-30', { leaves: [sick], holidays: [holiday('2026-11-30')] }).status).toBe('HOLIDAY')
    expect(resolve('2026-12-01', { leaves: [sick] }).status).toBe('LEAVE') // across the month end
  })

  it('ignores leaves of other employees', () => {
    expect(resolve('2026-11-24', { leaves: [{ ...annual, userId: 'u2' }] }).status).toBe('WORK')
  })
})

describe('half days', () => {
  it('ends the weekly half day at the shift half-day end (14:00)', () => {
    const d = resolve('2026-11-28', { user: user({ halfDays: [6] }) }) // Saturday
    expect(d).toMatchObject({ status: 'WORK', startTime: '08:00', endTime: '14:00', isHalfDay: true })
  })

  it('uses the half-day end set on the shift', () => {
    const own = new Map(shifts)
    own.set('pagi', { ...PAGI, halfDayEndTime: '13:00' })
    const d = resolveDay({ user: user({ halfDays: [6] }), date: '2026-11-28', shifts: own, leaves: [], holidays: [], override: null })
    expect(d.endTime).toBe('13:00')
  })

  it('moves the start for a late-in half-day leave', () => {
    const l = leave('HALF_DAY', [2026, 11, 24], [2026, 11, 24], { halfDayType: 'LATE_IN', halfDayTime: '11:00' })
    expect(resolve('2026-11-24', { leaves: [l] })).toMatchObject({ status: 'WORK', startTime: '11:00', endTime: '17:00', isHalfDay: true })
  })

  it('moves the end for an early-out half-day leave, after the weekly half day', () => {
    const l = leave('HALF_DAY', [2026, 11, 28], [2026, 11, 28], { halfDayType: 'EARLY_OUT', halfDayTime: '12:00' })
    const d = resolve('2026-11-28', { leaves: [l], user: user({ halfDays: [6] }) })
    expect(d).toMatchObject({ startTime: '08:00', endTime: '12:00', leave: { type: 'HALF_DAY' } })
  })
})

describe('countScheduledWorkDays', () => {
  it('counts working and leave days of a payroll period, without days off and holidays', () => {
    // 26 Nov - 25 Dec 2026: 30 days, 4 Sundays, Christmas on a Friday.
    const leaves = [leave('ANNUAL_LEAVE', [2026, 12, 1], [2026, 12, 2])]
    const holidays = [holiday('2026-12-25')]
    const days = dateKeyRange('2026-11-26', '2026-12-25').map((date) => resolve(date, { leaves, holidays }))
    expect(days).toHaveLength(30)
    expect(countScheduledWorkDays(days)).toBe(25)
    expect(days.filter((d) => d.status === 'LEAVE')).toHaveLength(2)
  })
})
