'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePush(userId?: string) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub)
            setIsSubscribed(true)
          }
        })
      }).catch(err => console.error('Service Worker registration failed:', err))
    }
  }, [])

  const subscribe = async () => {
    if (!registration || !userId) return false
    try {
      const permissionResult = await Notification.requestPermission()
      if (permissionResult !== 'granted') {
        throw new Error('Notification permission not granted')
      }

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      if (!publicVapidKey) throw new Error('VAPID public key is missing')

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
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
