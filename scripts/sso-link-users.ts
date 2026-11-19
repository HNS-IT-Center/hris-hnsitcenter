/**
 * Link HRIS users to their HNS SSO accounts (HNS-SSO-CLIENT.md §3.2).
 *
 *   npm run sso:link-users -- <sso-export.csv> [--apply] [--by-username] [--clear-staff-passwords]
 *
 * Input: SSO "API Management -> HRIS -> Ekspor CSV (sub <-> email)",
 * columns sub,username,email,name,status.
 *
 * - Dry run by default; --apply writes.
 * - Only fills User.ssoSub. Never changes primary keys, deletes or merges users.
 * - Skips and reports conflicts: user already linked to another sub, email
 *   matching several users, sub already used by another user.
 * - --clear-staff-passwords (with --apply) empties passwordHash of linked
 *   users: after go-live staff passwords live only in the SSO.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { prisma } from '../lib/prisma'

/** Minimal RFC 4180 parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

/** The SSO prefixes values with ' to defuse Excel formulas. */
const clean = (v: string | undefined) => (v ?? '').replace(/^'/, '').trim()

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
  const apply = process.argv.includes('--apply')
  const byUsername = process.argv.includes('--by-username')
  const clearPasswords = process.argv.includes('--clear-staff-passwords')
  if (!file) {
    console.error('Usage: npm run sso:link-users -- <sso-export.csv> [--apply] [--by-username] [--clear-staff-passwords]')
    process.exitCode = 1
    return
  }

  const [header, ...data] = parseCsv(readFileSync(file, 'utf8').replace(/^﻿/, ''))
  const col = (name: string) => header.map((h) => clean(h).toLowerCase()).indexOf(name)
  const iSub = col('sub'), iEmail = col('email'), iUsername = col('username')
  if (iSub < 0 || iEmail < 0) throw new Error('CSV must have sub and email columns')

  const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, ssoSub: true, name: true } })
  const bySub = new Map(users.filter((u) => u.ssoSub).map((u) => [u.ssoSub as string, u]))

  const linked: string[] = []
  const alreadyLinked: string[] = []
  const notFound: string[] = []
  const conflicts: string[] = []
  const seenUserIds = new Set<string>()
  const toLink: { id: string; sub: string }[] = []

  for (const r of data) {
    const sub = clean(r[iSub])
    const email = clean(r[iEmail]).toLowerCase()
    const username = iUsername >= 0 ? clean(r[iUsername]).toLowerCase() : ''
    if (!sub) continue

    let matches = users.filter((u) => u.email.trim().toLowerCase() === email)
    if (matches.length === 0 && byUsername && username) {
      matches = users.filter((u) => u.username?.toLowerCase() === username)
    }

    if (matches.length === 0) { notFound.push(`${email} (sub ${sub})`); continue }
    if (matches.length > 1) { conflicts.push(`${email}: matches ${matches.length} HRIS users`); continue }

    const user = matches[0]
    seenUserIds.add(user.id)
    if (user.ssoSub === sub) { alreadyLinked.push(email); continue }
    if (user.ssoSub && user.ssoSub !== sub) { conflicts.push(`${email}: already linked to another sub (${user.ssoSub})`); continue }
    const owner = bySub.get(sub)
    if (owner && owner.id !== user.id) { conflicts.push(`${email}: sub ${sub} is already used by ${owner.email}`); continue }

    toLink.push({ id: user.id, sub })
    bySub.set(sub, { ...user, ssoSub: sub })
    linked.push(email)
  }

  const missingInSso = users.filter((u) => !seenUserIds.has(u.id) && !u.ssoSub)

  if (apply) {
    for (const { id, sub } of toLink) {
      await prisma.user.update({ where: { id }, data: { ssoSub: sub } })
    }
    if (clearPasswords) {
      const cleared = await prisma.user.updateMany({ where: { ssoSub: { not: null }, passwordHash: { not: null } }, data: { passwordHash: null } })
      console.log(`Cleared local passwords of ${cleared.count} linked staff.`)
    }
  }

  const list = (title: string, items: string[]) => {
    console.log(`\n${title}: ${items.length}`)
    for (const i of items) console.log(`  - ${i}`)
  }
  console.log(apply ? 'MODE: APPLY' : 'MODE: DRY RUN (nothing written; add --apply to write)')
  list(apply ? 'Linked' : 'Would link', linked)
  console.log(`\nAlready linked: ${alreadyLinked.length}`)
  list('In SSO CSV but not found in HRIS', notFound)
  list('Conflicts (skipped)', conflicts)
  list('HRIS users not in the SSO CSV and not linked (create them in the SSO, or keep as history)',
    missingInSso.map((u) => `${u.email} (${u.name})`))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
