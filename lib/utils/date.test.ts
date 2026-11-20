import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDaysToKey,
  dateKeyRange,
  formatTimeWIB,
  getPayrollPeriod,
  getPayrollPeriodByMonth,
  nowWIB,
  parseShiftTime,
  shiftCrossesMidnight,
  toWIB,
  todayUTC,
  weekdayOfKey,
  wibDateKey,
  wibDayToUTC,
} from '@/lib/utils/date'

// The container runs in UTC; WIB is UTC+7. Every instant below is written in UTC
// with the WIB wall-clock time next to it.

afterEach(() => {
  vi.useRealTimers()
})

function at(isoUtc: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoUtc))
}

describe('todayUTC', () => {
  it('keeps the same WIB day at 23:30 WIB', () => {
    at('2026-11-19T16:30:00Z') // 19 Nov 23:30 WIB
    expect(todayUTC().toISOString()).toBe('2026-11-19T00:00:00.000Z')
  })

  it('moves to the next WIB day at 00:30 WIB while UTC is still on the previous day', () => {
    at('2026-11-19T17:30:00Z') // 20 Nov 00:30 WIB
    expect(todayUTC().toISOString()).toBe('2026-11-20T00:00:00.000Z')
  })

  it('crosses a month boundary on WIB time', () => {
    at('2026-11-30T16:30:00Z') // 30 Nov 23:30 WIB
    expect(todayUTC().toISOString()).toBe('2026-11-30T00:00:00.000Z')
    at('2026-11-30T17:30:00Z') // 1 Dec 00:30 WIB
    expect(todayUTC().toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })

  it('crosses a year boundary on WIB time', () => {
    at('2026-12-31T17:30:00Z') // 1 Jan 2027 00:30 WIB
    expect(todayUTC().toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })
})

describe('nowWIB / toWIB', () => {
  it('shifts the clock by +7 hours so UTC getters read WIB wall-clock time', () => {
    at('2026-11-19T16:30:00Z') // 19 Nov 23:30 WIB
    const now = nowWIB()
    expect(now.getUTCDate()).toBe(19)
    expect(now.getUTCHours()).toBe(23)
    expect(now.getUTCMinutes()).toBe(30)
  })

  it('reads the next day after WIB midnight', () => {
    const wib = toWIB(new Date('2026-11-19T17:30:00Z')) // 20 Nov 00:30 WIB
    expect(wib.getUTCDate()).toBe(20)
    expect(wib.getUTCHours()).toBe(0)
    expect(wib.getUTCMinutes()).toBe(30)
  })
})

describe('wibDayToUTC', () => {
  it('returns the instant of midnight WIB, which is 17:00 UTC of the previous day', () => {
    expect(wibDayToUTC(2026, 12, 1).toISOString()).toBe('2026-11-30T17:00:00.000Z')
    expect(wibDayToUTC(2027, 1, 1).toISOString()).toBe('2026-12-31T17:00:00.000Z')
  })
})

describe('formatTimeWIB', () => {
  it('formats a UTC instant as WIB hours and minutes', () => {
    expect(formatTimeWIB(new Date('2026-11-19T16:30:00Z'))).toMatch(/^23[.:]30$/)
    expect(formatTimeWIB(new Date('2026-11-19T17:30:00Z'))).toMatch(/^00[.:]30$/)
  })
})

describe('shiftCrossesMidnight', () => {
  it('detects shifts that end on the next day', () => {
    expect(shiftCrossesMidnight('21:00', '06:00')).toBe(true)
    expect(shiftCrossesMidnight('08:00', '17:00')).toBe(false)
  })
})

describe('getPayrollPeriod (26th - 25th, WIB)', () => {
  it('stays in the period ending on the 25th at 23:30 WIB on the 25th', () => {
    const p = getPayrollPeriod(new Date('2026-11-25T16:30:00Z')) // 25 Nov 23:30 WIB
    expect(p.startDateUTC.toISOString()).toBe('2026-10-25T17:00:00.000Z') // 26 Oct 00:00 WIB
    expect(p.endDateUTC.toISOString()).toBe('2026-11-25T16:59:59.999Z') // 25 Nov 23:59:59 WIB
    expect(p.periodLabel).toBe('26 Okt - 25 Nov 2026')
  })

  it('starts the next period at 00:30 WIB on the 26th', () => {
    const p = getPayrollPeriod(new Date('2026-11-25T17:30:00Z')) // 26 Nov 00:30 WIB
    expect(p.startDateUTC.toISOString()).toBe('2026-11-25T17:00:00.000Z')
    expect(p.endDateUTC.toISOString()).toBe('2026-12-25T16:59:59.999Z')
    expect(p.periodLabel).toBe('26 Nov - 25 Des 2026')
  })

  it('rolls the period end into the next year after 26 December', () => {
    const p = getPayrollPeriod(new Date('2026-12-26T03:00:00Z')) // 26 Dec 10:00 WIB
    expect(p.endDateUTC.toISOString()).toBe('2027-01-25T16:59:59.999Z')
    expect(p.periodLabel).toBe('26 Des - 25 Jan 2027')
  })
})

describe('getPayrollPeriodByMonth', () => {
  it('starts January payroll on 26 December of the previous year', () => {
    const { periodStart, periodEnd } = getPayrollPeriodByMonth(2027, 1)
    expect(periodStart.toISOString()).toBe('2026-12-26T00:00:00.000Z')
    expect(periodEnd.toISOString()).toBe('2027-01-25T00:00:00.000Z')
  })
})

describe('wibDateKey', () => {
  it('reads a stored day (T00:00:00Z) as that same day', () => {
    expect(wibDateKey(new Date('2026-11-20T00:00:00Z'))).toBe('2026-11-20')
  })

  it('reads a browser WIB midnight (17:00Z the day before) as the WIB day', () => {
    expect(wibDateKey(wibDayToUTC(2026, 12, 1))).toBe('2026-12-01')
  })

  it('moves an instant after 17:00Z to the next WIB day', () => {
    expect(wibDateKey(new Date('2026-11-19T16:59:00Z'))).toBe('2026-11-19') // 23:59 WIB
    expect(wibDateKey(new Date('2026-11-19T17:00:00Z'))).toBe('2026-11-20') // 00:00 WIB
  })
})

describe('date keys', () => {
  it('adds days across month and year ends', () => {
    expect(addDaysToKey('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToKey('2026-12-01', -1)).toBe('2026-11-30')
  })

  it('lists every day of a range, both ends included', () => {
    expect(dateKeyRange('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'])
    expect(dateKeyRange('2026-12-02', '2026-12-01')).toEqual([])
  })

  it('gives the weekday with 0 = Sunday', () => {
    expect(weekdayOfKey('2026-11-22')).toBe(0) // Sunday
    expect(weekdayOfKey('2026-11-23')).toBe(1) // Monday
  })
})

describe('parseShiftTime', () => {
  it('turns 08:00 WIB into 01:00 UTC on the same day, from either form of day', () => {
    expect(parseShiftTime(new Date('2026-11-20T00:00:00Z'), '08:00').toISOString()).toBe('2026-11-20T01:00:00.000Z')
    expect(parseShiftTime(wibDayToUTC(2026, 11, 20), '08:00').toISOString()).toBe('2026-11-20T01:00:00.000Z')
  })

  it('puts 00:30 WIB on 17:30 UTC of the previous day', () => {
    expect(parseShiftTime(new Date('2026-11-20T00:00:00Z'), '00:30').toISOString()).toBe('2026-11-19T17:30:00.000Z')
  })
})
