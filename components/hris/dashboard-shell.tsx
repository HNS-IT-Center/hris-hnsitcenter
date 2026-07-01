"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/hris/sidebar"
import { Topbar } from "@/components/hris/topbar"
import type { NavId } from "@/components/hris/sidebar"

export interface DashboardUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string  // 'EMPLOYEE' | 'HRD' | 'BOSS'
  department?: { id: string; name: string }
  store?: { id: string; name: string }
  shift?: { id: string; name: string; startTime: string; endTime: string }
}

interface DashboardShellProps {
  user: DashboardUser
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [mobileOpen])

  // Derive role for sidebar — based on URL path!
  const isHrdAuthorized = user.role === "HRD" || user.role === "BOSS"
  const isHrdRoute = pathname?.startsWith('/hrd')
  const sidebarRole = (isHrdAuthorized && isHrdRoute) ? "hrd" : "employee"

  const activeNavId: NavId = "dashboard" // default fallback

  const handleLogout = (): void => {
    window.location.href = '/api/auth/logout'
  }

  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const isSwiping = useRef(false)
  const isScrolling = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchCurrentX.current = e.touches[0].clientX
    isScrolling.current = false
    // Allow swipe to open from anywhere as requested by user
    // If sidebar is already open, any swipe start is fine
    // (Removed the > 30px check)
    isSwiping.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current || isScrolling.current) return
    
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    
    // If scrolling vertically more than horizontally, cancel swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      isScrolling.current = true
      isSwiping.current = false
      setSwipeOffset(0)
      return
    }

    touchCurrentX.current = e.touches[0].clientX
    
    if (mobileOpen) {
      // Only swipe left when open
      if (deltaX < 0) {
        setSwipeOffset(Math.max(-260, deltaX))
      }
    } else {
      // Only swipe right when closed
      if (deltaX > 0) {
        setSwipeOffset(Math.min(260, deltaX))
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return
    isSwiping.current = false
    
    // Use changedTouches for the exact release coordinate
    const endX = e.changedTouches[0].clientX
    const delta = endX - touchStartX.current
    
    // Require a significant drag to toggle (100px)
    if (mobileOpen && delta < -100) {
      setMobileOpen(false)
    } else if (!mobileOpen && delta > 100) {
      setMobileOpen(true)
    }
    setSwipeOffset(0)
  }

  return (
    <div 
      className="min-h-[100dvh] bg-background relative overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Sidebar
        role={sidebarRole}
        active={activeNavId}
        onSelect={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        user={user}
        swipeOffset={swipeOffset}
        isSwiping={isSwiping.current}
      />

      <div className="flex min-h-[100dvh] flex-col lg:pl-[260px]">
        <Topbar
          title="HRIS"
          role={sidebarRole}
          onMenu={() => setMobileOpen(true)}
          user={user}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

