/**
 * Set a user's HRIS role from the command line. Use it to appoint the first
 * ADMIN; after that roles are managed on the Employees page.
 *
 *   npm run auth:set-role -- <email> <EMPLOYEE|HRD|BOSS|ADMIN>
 *
 * The user must exist (pre-register them on the Employees page, or let them
 * sign in once through the SSO).
 */
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { HRIS_ROLES, isHrisRole } from '../lib/auth/roles'

async function main() {
  const [email, role] = process.argv.slice(2)
  if (!email || !isHrisRole(role)) {
    console.error(`Usage: npm run auth:set-role -- <email> <${HRIS_ROLES.join('|')}>`)
    process.exitCode = 1
    return
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, role: true } })
  if (!user) {
    console.error(`No HRIS user with email ${email}.`)
    process.exitCode = 1
    return
  }
  await prisma.user.update({ where: { id: user.id }, data: { role } })
  console.log(`${email}: ${user.role} -> ${role}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
