import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const hash = await bcrypt.hash('hns123456', 10)
  console.log('Hash for hns123456:', hash)

  const emails = [
    'kentoni@hns.id', 'yani@hns.id', 'yuli@hns.id', 'syaril@hns.id', 'rina@hns.id', 'cons@hns.id',
    'nessa@hns.id', 'tanjung@hns.id', 'steaven@hns.id', 'mitchell@hns.id', 'rianto@hns.id', 'raffi@hns.id',
    'jeldy@hns.id', 'dennis@hns.id', 'rafael@hns.id', 'febrian@hns.id', 'jho@hns.id', 'kelvin@hns.id',
    'selly@hns.id', 'ihza@hns.id', 'chandra@hns.id', 'rika@hns.id', 'erikasilv@hns.id', 'arif@hns.id',
    'rendi@hns.id', 'hendra@hns.id', 'rani@hns.id', 'windy@hns.id', 'jesen@hns.id', 'rei@hns.id',
    'fikry@hns.id', 'jun@hns.id', 'ivan@hns.id', 'aaw@hns.id', 'naldi@hns.id', 'indah@hns.id',
    'ghossan@hns.id', 'frina@hns.id', 'erika@hns.id', 'riyan@hns.id', 'tyo@hns.id', 'sindy@hns.id',
    'cristine@hns.id', 'agi@hns.id', 'omi@hns.id', 'nicholas@hns.id', 'tasya@hns.id'
  ]

  const result = await prisma.user.updateMany({
    where: { email: { in: emails } },
    data: { passwordHash: hash }
  })
  
  console.log(`Updated ${result.count} users.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
