'use client'

import { useEffect, useState } from 'react'
import { usePush } from '@/hooks/use-push'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export function PushSubscriber({ userId }: { userId: string }) {
  const { isSubscribed, subscribe, unsubscribe } = usePush(userId)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  if (permission === 'denied') {
    return <span className="text-[10px] text-destructive">Diblokir Browser</span>
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground">Push Notif:</span>
      <Switch 
        checked={isSubscribed}
        onCheckedChange={(checked) => checked ? subscribe() : unsubscribe()}
        title={isSubscribed ? "Nonaktifkan Notifikasi" : "Aktifkan Notifikasi"}
      />
    </div>
  )
}
