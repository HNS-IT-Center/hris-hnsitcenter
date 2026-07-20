"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/hris-data"
import type { DashboardUser } from "@/components/hris/dashboard-shell"
import { PushSubscriber } from "@/components/hris/push-subscriber"
import { Bell, Menu, Moon, Sun, UserCog } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { getAppNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notification"

interface TopbarProps {
  title: string
  role: Role
  onMenu: () => void
  user?: DashboardUser
  // legacy prop kept for prototype compat — remove when fully wired
  onRoleChange?: (role: Role) => void
}

export function Topbar({ title, role, onMenu, user }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const pathname = usePathname()
  
  useEffect(() => {
    setMounted(true)
    if (user?.id) {
      getAppNotifications(user.id).then(res => {
        if (res.success && res.data) {
          setNotifications(res.data)
        }
      })
    }
  }, [user?.id])

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    await markNotificationAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    await markAllNotificationsAsRead(user.id)
  }

  const unread = notifications.filter((n) => !n.isRead).length

  const isHrdMode = pathname?.startsWith('/hrd')
  const canSwitch = user?.role === "HRD" || user?.role === "BOSS"

  return (
    <header className="glass-strong sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href={isHrdMode ? "/hrd/dashboard" : "/dashboard"} className="hover:opacity-80 transition-opacity">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {canSwitch && (
          <Link
            href={isHrdMode ? "/dashboard" : "/hrd/dashboard"}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all mr-1",
              isHrdMode 
                ? "border-primary/50 bg-primary/10 text-primary shadow-sm" 
                : "border-border bg-muted/60 text-muted-foreground hover:bg-accent/30"
            )}
            title={isHrdMode ? "Beralih ke mode Karyawan" : "Beralih ke mode HRD"}
          >
            <UserCog className={cn("h-4 w-4", isHrdMode && "text-primary")} />
            <span className="hidden sm:inline-block font-semibold">
              {isHrdMode ? `Mode ${user?.role === "BOSS" ? "Boss" : "HRD"}` : "Mode Karyawan"}
            </span>
          </Link>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Ganti tema"
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <div>
                Notifikasi
                <div className="text-[10px] font-normal text-muted-foreground flex items-center gap-2">
                  {unread === 0 ? "Semua telah dibaca" : `${unread} belum dibaca`}
                  {unread > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-primary hover:underline ml-1">
                      (Tandai semua dibaca)
                    </button>
                  )}
                </div>
              </div>
              {user?.id && <PushSubscriber userId={user.id} />}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada notifikasi
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={cn("flex flex-col items-start gap-0.5 py-2.5 cursor-pointer", !n.isRead && "bg-accent/30")}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id)
                      if (n.url) window.location.href = n.url
                    }}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{n.title}</span>
                      {!n.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-destructive flex-shrink-0" />}
                    </div>
                    <span className="line-clamp-2 text-xs text-muted-foreground text-left">{n.message}</span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
