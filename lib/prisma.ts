/**
 * Prisma Client Singleton for Prisma 7.
 *
 * Prisma 7 requires a driver adapter to be passed to PrismaClient.
 * We use @prisma/adapter-pg with the DATABASE_URL environment variable.
 *
 * The client is lazily initialised and reused across hot reloads in dev.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    // During build time / static generation, DATABASE_URL may not be set.
    // We throw a clear error here rather than a cryptic one from the driver.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL environment variable is not set.')
    }
    // In development with no DB configured, create a no-op client.
    // This prevents build failures when DB is not yet configured.
    console.warn('[Prisma] DATABASE_URL is not set. Database operations will fail at runtime.')
    // @ts-expect-error — create a placeholder for build-time static analysis
    return new PrismaClient()
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
