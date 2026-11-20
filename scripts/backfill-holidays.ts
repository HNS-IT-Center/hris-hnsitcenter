/**
 * Fill the Holiday table from the older holiday sources. Run once per database
 * after prisma/sql/2026-11-20-holiday-dan-override.sql (or `prisma db push`).
 *
 *   npx tsx scripts/backfill-holidays.ts           # dry run: prints what it would do
 *   npx tsx scripts/backfill-holidays.ts --apply   # writes
 *
 * Sources, in order:
 *   1. CalendarEvent of type "holiday" or "rainy" without a Holiday row.
 *      Events for one shift or for named people are skipped and listed: set
 *      those days off in the roster instead.
 *   2. HolidayMarker rows that apply to everyone (no assignment, or applyToAll).
 *      Markers for named people are skipped and listed.
 *   3. RainyDay rows (all stores, or one store).
 * A row is skipped when a Holiday with the same date, scope, store, department
 * and rainy flag already exists, so running it twice changes nothing.
 */
import 'dotenv/config'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { HOLIDAY_EVENT_TYPES, holidayFromCalendarEvent } from '../lib/holidays'

type Row = Prisma.HolidayUncheckedCreateInput

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

async function exists(row: Row): Promise<boolean> {
  const found = await prisma.holiday.findFirst({
    where: {
      date: row.date,
      scope: row.scope,
      storeId: row.storeId ?? null,
      departmentId: row.departmentId ?? null,
      isRainyDay: row.isRainyDay ?? false,
    },
    select: { id: true },
  })
  return !!found
}

async function main() {
  const apply = process.argv.includes('--apply')
  const toCreate: { row: Row; from: string }[] = []
  const skipped: string[] = []

  // 1. Calendar events. Resolve names without creating departments in a dry run.
  const events = await prisma.calendarEvent.findMany({
    where: { type: { in: [...HOLIDAY_EVENT_TYPES] }, holiday: null },
    orderBy: { date: 'asc' },
  })
  for (const event of events) {
    const label = `kalender ${day(event.date)} "${event.title}" (${event.type}, ${event.scope}${event.scopeValue ? `: ${event.scopeValue}` : ''})`
    if (event.scope === 'department' && !apply) {
      toCreate.push({ row: { date: event.date, name: event.title, scope: 'DEPARTMENT', calendarEventId: event.id }, from: label })
      continue
    }
    const result = await holidayFromCalendarEvent(prisma, event)
    if ('error' in result) skipped.push(`${label}: ${result.error}`)
    else toCreate.push({ row: result.data, from: label })
  }

  // 2. Legacy HolidayMarker.
  const markers = await prisma.holidayMarker.findMany({ include: { assignments: true }, orderBy: { date: 'asc' } })
  for (const m of markers) {
    const label = `HolidayMarker ${day(m.date)} "${m.name}"`
    const forAll = m.assignments.length === 0 || m.assignments.some((a) => a.applyToAll)
    if (!forAll) {
      skipped.push(`${label}: hanya untuk ${m.assignments.length} karyawan tertentu, atur di roster`)
      continue
    }
    const row: Row = { date: new Date(`${day(m.date)}T00:00:00Z`), name: m.name, scope: 'ALL' }
    if (await exists(row)) skipped.push(`${label}: sudah ada`)
    else toCreate.push({ row, from: label })
  }

  // 3. Legacy RainyDay.
  const rainy = await prisma.rainyDay.findMany({ include: { store: { select: { name: true } } }, orderBy: { date: 'asc' } })
  for (const r of rainy) {
    const label = `RainyDay ${day(r.date)} ${r.store?.name ?? 'semua toko'}`
    const row: Row = {
      date: new Date(`${day(r.date)}T00:00:00Z`),
      name: 'Hari Hujan',
      scope: r.storeId ? 'STORE' : 'ALL',
      storeId: r.storeId,
      isRainyDay: true,
    }
    if (await exists(row)) skipped.push(`${label}: sudah ada`)
    else toCreate.push({ row, from: label })
  }

  console.log(`${apply ? 'Menulis' : 'Dry run'}: ${toCreate.length} baris Holiday baru, ${skipped.length} dilewati.`)
  for (const { from } of toCreate) console.log(`  + ${from}`)
  for (const s of skipped) console.log(`  - ${s}`)

  if (!apply) {
    if (toCreate.length > 0) console.log('Jalankan lagi dengan --apply untuk menulis.')
    return
  }
  await prisma.$transaction(toCreate.map(({ row }) => prisma.holiday.create({ data: row })))
  console.log('Selesai.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
