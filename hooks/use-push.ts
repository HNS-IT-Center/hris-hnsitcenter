'use client'

import { useState, useEffect } from 'react'

export function usePush(userId?: string) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      // we can register sw
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub)
            setIsSubscribed(true)
          }
        })
      })
    }
  }, [])

  const subscribe = async () => {
    if (!registration || !userId) return false
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      setSubscription(sub)
      setIsSubscribed(true)

      await fetch('/api/web-push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub })
      })
      return true
    } catch (e) {
      console.error('Failed to subscribe to push', e)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return
    try {
      await subscription.unsubscribe()
      setIsSubscribed(false)
      setSubscription(null)

      await fetch('/api/web-push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      })
    } catch (e) {
      console.error('Failed to unsubscribe', e)
    }
  }

  return { isSubscribed, subscribe, unsubscribe }
}
