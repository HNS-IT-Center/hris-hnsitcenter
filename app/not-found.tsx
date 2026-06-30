import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/hris/shared'

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 animate-in zoom-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/20 text-secondary">
          <FileQuestion className="h-10 w-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">404 Not Found</h1>
          <p className="text-muted-foreground">
            Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
          </p>
        </div>

        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/dashboard">
            Kembali ke Dashboard
          </Link>
        </Button>
      </GlassCard>
    </div>
  )
}
