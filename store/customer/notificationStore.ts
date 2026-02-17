import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
    id: string
    title: string
    message: string
    type: 'order_status' | 'promo' | 'system'
    timestamp: number
    read: boolean
    link?: string
}

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,

            addNotification: (notification) => {
                const newNotification: Notification = {
                    ...notification,
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now(),
                    read: false,
                }

                set((state) => ({
                    notifications: [newNotification, ...state.notifications],
                    unreadCount: state.unreadCount + 1
                }))
            },

            markAsRead: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id)
                    if (notification && !notification.read) {
                        return {
                            notifications: state.notifications.map(n =>
                                n.id === id ? { ...n, read: true } : n
                            ),
                            unreadCount: Math.max(0, state.unreadCount - 1)
                        }
                    }
                    return state
                })
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0
                }))
            },

            clearNotifications: () => {
                set({ notifications: [], unreadCount: 0 })
            }
        }),
        {
            name: 'restaurant-notifications',
        }
    )
)
