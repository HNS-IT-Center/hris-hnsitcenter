import { ShiftsPage } from "@/components/hris/pages/shifts"
import { getShifts } from "@/app/actions/shift"

export default async function Page() { 
  const shifts = await getShifts()
  return <ShiftsPage initialShifts={shifts} /> 
}
