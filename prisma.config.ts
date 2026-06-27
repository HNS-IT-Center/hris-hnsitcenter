import { defineConfig } from 'prisma/config'
import 'dotenv/config'

/**
 * Prisma 7 configuration file.
 * Database connection URLs are configured here instead of schema.prisma.
 *
 * Set these environment variables in .env.local:
 * - DATABASE_URL  : Your PostgreSQL connection string (pooled for runtime)
 * - DIRECT_URL    : Direct non-pooled connection (required for migrations)
 */
export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts'
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
      return new PrismaPg({ connectionString })
    },
  },
})
