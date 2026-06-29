import { EmployeesPage } from "@/components/hris/pages/employees"
import { getEmployees } from "@/app/actions/employee"
import { getStores } from "@/app/actions/store"
import { getShifts } from "@/app/actions/shift"

export default async function Page() { 
  const employees = await getEmployees()
  const stores = await getStores()
  const shifts = await getShifts()

  return <EmployeesPage initialEmployees={employees} stores={stores} shifts={shifts} /> 
}
