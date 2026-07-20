"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function UnauthorizedRedirect() {
  const router = useRouter()

  useEffect(() => {
    toast.error("Anda tidak memiliki akses untuk melihat halaman ini!")
    router.replace("/") // Redirects to the dashboard
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Akses Ditolak</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Mengalihkan...</p>
      </div>
    </div>
  )
}
