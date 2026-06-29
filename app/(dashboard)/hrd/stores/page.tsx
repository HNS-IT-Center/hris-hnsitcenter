import { StoresPage } from "@/components/hris/pages/stores"
import { getStores } from "@/app/actions/store"

export default async function Page() { 
  const stores = await getStores()
  return <StoresPage initialStores={stores} /> 
}
