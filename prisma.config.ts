import { defineConfig } from 'prisma/config'
import 'dotenv/config'

/**
 * Prisma 7 configuration file.
 * Database connection URLs are configured here instead of schema.prisma.
 *
 * Set these environment variables in .env.local:
 * - DATABASE_URL  : MySQL/MariaDB connection string (runtime)
 * - DIRECT_URL    : Optional, used for migrations (falls back to DATABASE_URL)
 */
export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts'
  },
  migrate: {
    async adapter() {
      const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
      const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
      return new PrismaMariaDb(connectionString)
    },
  },
})
