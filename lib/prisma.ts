/**
 * Prisma Client Singleton for Prisma 7.
 *
 * Prisma 7 requires a driver adapter to be passed to PrismaClient.
 * We use @prisma/adapter-mariadb (MariaDB/MySQL on Hostinger) with DATABASE_URL.
 *
 * The client is lazily initialised and reused across hot reloads in dev.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Build the MariaDB pool config from DATABASE_URL.
 *
 * Hostinger's MariaDB sends bound string parameters as utf8mb4_general_ci while
 * the connection and columns use utf8mb4_unicode_ci. Prisma's `contains` /
 * `startsWith` compile to LIKE CONCAT(?, '%'), and mixing those collations fails
 * with "Illegal mix of collations ... for operation 'like'". Forcing the session
 * collation on every new connection keeps parameters and columns consistent.
 *
 * Passed as an object (not a URL) because the adapter re-serialises the URL and
 * turns spaces in `initSql` into '+'.
 */
function mariaDbConfig(connectionString: string) {
  const url = new URL(connectionString)
  const numberParam = (key: string) =>
    url.searchParams.has(key) ? Number(url.searchParams.get(key)) : undefined
  const connectionLimit = numberParam('connectionLimit')
  const connectTimeout = numberParam('connectTimeout')

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ...(connectionLimit !== undefined && { connectionLimit }),
    ...(connectTimeout !== undefined && { connectTimeout }),
    initSql: 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci',
  }
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

  const adapter = new PrismaMariaDb(mariaDbConfig(connectionString))

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
