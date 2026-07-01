'use client'

import { useEffect, useState } from 'react'
import { usePush } from '@/hooks/use-push'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'

export function PushSubscriber({ userId }: { userId: string }) {
  const { isSubscribed, subscribe, unsubscribe } = usePush(userId)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  if (permission === 'denied') return null

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={isSubscribed ? unsubscribe : subscribe}
      title={isSubscribed ? "Nonaktifkan Notifikasi" : "Aktifkan Notifikasi"}
      className="rounded-full"
    >
      {isSubscribed ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
    </Button>
  )
}
