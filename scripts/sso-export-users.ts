/**
 * Export HRIS staff to a CSV for HNS SSO "Pengguna -> Impor CSV" (HNS-SSO-CLIENT.md §3.1).
 *
 *   npm run sso:export-users -- [--out <file.csv>]
 *
 * Columns: email,username,name,status,password_hash
 * - Only bcrypt hashes ($2a$/$2b$/$2y$) are exported; other hashes are left empty.
 * - Test, seed and dummy accounts are skipped.
 * - The file contains password hashes: it is written outside the repository by
 *   default. Delete it after the import and never commit or share it.
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { prisma } from '../lib/prisma'

const SKIP_EMAILS = new Set(['dev@hnsitcenter.id', 'employee@hnsitcenter.id'])
const SKIP_DOMAINS = ['@dummy.local', '@example.com', '@test.local']
const BCRYPT = /^\$2[aby]\$\d{2}\$.{53}$/
const USERNAME = /^[a-z0-9._-]{3,64}$/

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const date = new Date().toISOString().slice(0, 10)
  const out = resolve(argValue('--out') ?? join(homedir(), `hris-sso-export-${date}.csv`))

  const users = await prisma.user.findMany({
    select: { email: true, username: true, name: true, isActive: true, passwordHash: true },
    orderBy: { email: 'asc' },
  })

  const rows: string[] = ['email,username,name,status,password_hash']
  let skipped = 0
  let withHash = 0

  for (const u of users) {
    const email = u.email.trim().toLowerCase()
    if (SKIP_EMAILS.has(email) || SKIP_DOMAINS.some((d) => email.endsWith(d))) {
      skipped++
      continue
    }
    const username = u.username && USERNAME.test(u.username) ? u.username : ''
    const hash = u.passwordHash && BCRYPT.test(u.passwordHash) ? u.passwordHash : ''
    if (hash) withHash++
    rows.push([email, username, u.name, u.isActive ? 'active' : 'disabled', hash].map(csvCell).join(','))
  }

  writeFileSync(out, rows.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${rows.length - 1} staff to ${out}`)
  console.log(`  with bcrypt password hash: ${withHash}`)
  console.log(`  skipped (test/seed/dummy): ${skipped}`)
  console.log('This file contains password hashes. Delete it after importing it into the SSO.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
