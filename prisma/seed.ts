import { prisma } from '../lib/prisma'

async function main() {
  console.log('Seeding database...')

  // 1. Departments
  const itDept = await prisma.department.upsert({
    where: { name: 'IT Department' },
    update: {},
    create: { name: 'IT Department' },
  })

  const hrDept = await prisma.department.upsert({
    where: { name: 'HR Department' },
    update: {},
    create: { name: 'HR Department' },
  })

  // 2. Stores / Branches
  const hqStore = await prisma.store.upsert({
    where: { id: 'store_hq_001' },
    update: {},
    create: {
      id: 'store_hq_001',
      name: 'HNS Pusat Jakarta',
      address: 'Jl. Sudirman No. 1, Jakarta',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 150,
      openTime: '08:00',
      closeTime: '17:00',
    },
  })

  // 3. Shifts
  const morningShift = await prisma.shift.upsert({
    where: { id: 'shift_morning' },
    update: {},
    create: {
      id: 'shift_morning',
      name: 'Pagi (08:00 - 17:00)',
      startTime: '08:00',
      endTime: '17:00',
      checkinWindowMin: 30,
    },
  })

  const eveningShift = await prisma.shift.upsert({
    where: { id: 'shift_evening' },
    update: {},
    create: {
      id: 'shift_evening',
      name: 'Malam (15:00 - 00:00)',
      startTime: '15:00',
      endTime: '00:00',
      checkinWindowMin: 30,
    },
  })

  // 4. Users (Dummy users for testing)
  // Dev User (HRD) - Matches the mock user in proxy.ts
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@hnsitcenter.id' },
    update: {},
    create: {
      ssoId: 'dev-user-id',
      email: 'dev@hnsitcenter.id',
      name: 'Developer HRD',
      username: 'dev_hrd',
      role: 'HRD',
      position: 'HR Manager',
      departmentId: hrDept.id,
      storeId: hqStore.id,
      shiftId: morningShift.id,
    },
  })

  // Test Employee
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@hnsitcenter.id' },
    update: {},
    create: {
      ssoId: 'emp-user-id',
      email: 'employee@hnsitcenter.id',
      name: 'Budi Karyawan',
      username: 'budi_emp',
      role: 'EMPLOYEE',
      position: 'Staff IT',
      departmentId: itDept.id,
      storeId: hqStore.id,
      shiftId: eveningShift.id,
    },
  })

  console.log('Seeding completed successfully!')
  console.log({ devUser, employeeUser })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
