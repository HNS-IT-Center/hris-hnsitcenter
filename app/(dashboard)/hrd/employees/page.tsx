import { EmployeesPage } from "@/components/hris/pages/employees"
import { getEmployees, getUniquePositions } from "@/app/actions/employee"
import { getStores } from "@/app/actions/store"
import { getShifts } from "@/app/actions/shift"
import { getServerUser } from "@/lib/auth"

export default async function Page() { 
  // Cache bust to fix Vercel build using old Prisma schema cache
  console.log("Fetching employees...")
  const [employees, stores, shifts, positions, currentUser] = await Promise.all([
    getEmployees(),
    getStores(),
    getShifts(),
    getUniquePositions(),
    getServerUser()
  ])

  return <EmployeesPage initialEmployees={employees} stores={stores} shifts={shifts} positions={positions} currentUserId={currentUser.id} /> 
}
