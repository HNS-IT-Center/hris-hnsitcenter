import type { Prisma } from '@prisma/client'

/**
 * MySQL/MariaDB has no native array columns, so list fields such as
 * `weeklyOffDays`, `halfDays` and `shiftCycle` are stored as JSON.
 * These helpers turn the raw JsonValue back into a typed array.
 */

export function toNumberArray(value: Prisma.JsonValue | null | undefined): number[] {
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : []
}

export function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
