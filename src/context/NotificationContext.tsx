"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/context/AuthContext"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  announceToHospital,
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notifyHospital,
  subscribeToNotifications,
  updateNotificationPreferences,
  type AppNotification,
  type NotificationPreferences,
  type NotifyHospitalInput,
} from "@/lib/notifications"

const PAGE_SIZE = 20

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  hasMore: boolean
  preferences: NotificationPreferences
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>
  /** Fire a hospital notification. Never throws — a failed ping must not break the action that triggered it. */
  notify: (input: NotifyHospitalInput) => Promise<void>
  announce: (title: string, description: string, link?: string | null) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  )
  // Guards against a stale realtime refresh overwriting a newer page fetch.
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    const id = ++requestId.current
    setIsLoading(true)
    try {
      const [page, unread] = await Promise.all([
        getNotifications({ limit: PAGE_SIZE, offset: 0 }),
        getUnreadNotificationCount(),
      ])
      if (id !== requestId.current) return
      setNotifications(page)
      setUnreadCount(unread)
      setHasMore(page.length === PAGE_SIZE)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    } finally {
      if (id === requestId.current) setIsLoading(false)
    }
  }, [user?.id])

  const loadMore = useCallback(async () => {
    if (!user?.id || isLoading || !hasMore) return
    const id = requestId.current
    setIsLoading(true)
    try {
      const next = await getNotifications({ limit: PAGE_SIZE, offset: notifications.length })
      if (id !== requestId.current) return
      setNotifications((prev) => [...prev, ...next])
      setHasMore(next.length === PAGE_SIZE)
    } catch (error) {
      console.error("Failed to load more notifications:", error)
    } finally {
      if (id === requestId.current) setIsLoading(false)
    }
  }, [user?.id, isLoading, hasMore, notifications.length])

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge and the row should react instantly.
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id)
      if (target && !target.read) setUnreadCount((count) => Math.max(0, count - 1))
      return prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    })
    try {
      await markNotificationRead(id)
    } catch (error) {
      console.error("Failed to mark notification read:", error)
      void refresh()
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch (error) {
      console.error("Failed to mark all notifications read:", error)
      void refresh()
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id)
      if (target && !target.read) setUnreadCount((count) => Math.max(0, count - 1))
      return prev.filter((n) => n.id !== id)
    })
    try {
      await deleteNotification(id)
    } catch (error) {
      console.error("Failed to delete notification:", error)
      void refresh()
    }
  }, [refresh])

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    try {
      await updateNotificationPreferences(patch)
    } catch (error) {
      console.error("Failed to save notification preferences:", error)
      setPreferences(preferences)
      throw error
    }
  }, [preferences])

  const notify = useCallback(async (input: NotifyHospitalInput) => {
    try {
      await notifyHospital(input)
    } catch (error) {
      // An event notification is a nice-to-have; never surface it as a failure.
      console.warn("Failed to send notification:", error)
    }
  }, [])

  const announce = useCallback(async (title: string, description: string, link?: string | null) => {
    await announceToHospital(title, description, link)
    void refresh()
  }, [refresh])

  // Initial load + realtime subscription, keyed on the signed-in user.
  useEffect(() => {
    if (!user?.id) {
      requestId.current += 1
      setNotifications([])
      setUnreadCount(0)
      setHasMore(false)
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
      return
    }

    void refresh()

    const unsubscribe = subscribeToNotifications(user.id, () => {
      void refresh()
    })

    void getNotificationPreferences()
      .then(setPreferences)
      .catch((error) => console.error("Failed to load notification preferences:", error))

    return unsubscribe
  }, [user?.id, refresh])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        preferences,
        refresh,
        loadMore,
        markRead,
        markAllRead,
        remove,
        updatePreferences,
        notify,
        announce,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
