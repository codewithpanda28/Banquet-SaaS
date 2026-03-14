'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Utensils, Box, MapPin, Bell, Check, Trash2, ArrowRight, Clock, Flame } from 'lucide-react'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { OrderType } from '@/types'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import useSound from 'use-sound'

export function Header() {
    const { restaurant } = useRestaurant()
    const { items, tableNumber, orderType, setOrderType } = useCartStore()
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore()
    const [scrolled, setScrolled] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    const [playNotification] = useSound('/sounds/notification.mp3')

    // Mount detection only - no scroll shrinking
    useEffect(() => {
        setMounted(true)
    }, [])

    // Sound notification trigger
    useEffect(() => {
        if (unreadCount > 0 && mounted) {
            playNotification()
        }
    }, [unreadCount, mounted, playNotification])

    const handleNotificationClick = useCallback((id: string, link?: string) => {
        markAsRead(id)
        if (link) {
            router.push(link)
        }
    }, [markAsRead, router])

    if (!restaurant) return null

    const orderTypeConfig = {
        dine_in: { label: 'Dine In', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
        take_away: { label: 'Takeaway', icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
        home_delivery: { label: 'Delivery', icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    }

    const currentType = orderType ? orderTypeConfig[orderType as keyof typeof orderTypeConfig] : { label: 'Order Type', icon: ShoppingBag, color: 'text-gray-600', bg: 'bg-gray-50' }
    const TypeIcon = currentType.icon

    return (
        <header
            className="sticky top-0 left-0 right-0 z-50 transition-all duration-300 ease-out px-4 py-1 bg-white border-b border-gray-100 shadow-sm will-change-transform"
        >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo & Brand Group */}
                <div
                    className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform duration-200"
                    onClick={() => router.push('/customer/menu')}
                >
                    <div className="relative">
                        <Avatar className="h-8 w-8 ring-2 ring-white shadow-xl transition-all duration-300 ease-out">
                            <AvatarImage src={restaurant.logo_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-rose-600 text-white font-black text-lg">
                                {restaurant.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    </div>

                    <div className="flex flex-col">
                        <h1 className="font-black tracking-tight text-slate-950 transition-all duration-300 ease-out leading-none text-sm sm:text-base">
                            {restaurant.name}
                        </h1>
                        <div className="flex items-center gap-1 transition-all duration-300 opacity-100 h-auto mt-1">
                            <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-orange-600/90 whitespace-nowrap">
                                Tasty & Healthy
                            </span>
                        </div>
                    </div>
                </div>

                {/* Interaction Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Order History link - Minimalistic Circle */}
                    {mounted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/customer/orders')}
                            className="rounded-2xl w-10 h-10 hover:bg-slate-100/80 transition-all active:scale-90"
                            title="Recent Orders"
                        >
                            <Clock className="w-5 h-5 text-slate-600" />
                        </Button>
                    )}

                    {/* Cart Indicator */}
                    {mounted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                // Unified cart & upsell trigger
                                const { openCart, openUpsell } = useUIStore.getState()
                                const { items } = useCartStore.getState()
                                openCart()
                                if (items.length > 0) {
                                    setTimeout(() => openUpsell(items[items.length - 1].id), 200)
                                }
                            }}
                            className="rounded-2xl w-10 h-10 relative hover:bg-slate-100/80 transition-all active:scale-90 mr-1"
                        >
                            <ShoppingBag className="w-5 h-5 text-slate-600" />
                            {items.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-[9px] font-black text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-primary/20">
                                    {items.reduce((acc, i) => acc + i.quantity, 0)}
                                </span>
                            )}
                        </Button>
                    )}

                    {/* Notifications Hub */}
                    {mounted ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-2xl w-10 h-10 relative hover:bg-slate-100/80 transition-all active:scale-90"
                                >
                                    <Bell className={cn("w-5 h-5 text-slate-600 transition-colors", unreadCount > 0 && "animate-tada text-orange-500")} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white shadow-sm ring-1 ring-red-200" />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="center" style={{ width: '300px', maxWidth: '90vw' }} className="p-0 rounded-[28px] overflow-hidden shadow-2xl border-white/20 bg-white/95 backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50/50">
                                    <h4 className="font-black text-sm tracking-tight text-slate-900">Notifications</h4>
                                    {notifications.length > 0 && (
                                        <div className="flex gap-1.5">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white shadow-sm" onClick={markAllAsRead}>
                                                <Check className="w-4 h-4 text-green-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-50" onClick={clearNotifications}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <ScrollArea className="h-[380px]">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Bell className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-900 text-sm">Quiet for now</p>
                                                <p className="text-xs text-slate-500 leading-relaxed">Notifications about your orders will appear here.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifications.map((notification) => (
                                                <button
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification.id, notification.link)}
                                                    className={cn(
                                                        "flex items-start gap-4 p-5 text-left hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0",
                                                        !notification.read && "bg-orange-50/50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm",
                                                        !notification.read ? "bg-orange-600 ring-4 ring-orange-100" : "bg-slate-200"
                                                    )} />
                                                    <div className="flex-1 space-y-1.5">
                                                        <h5 className={cn("text-xs font-black tracking-tight", !notification.read ? "text-slate-900" : "text-slate-500")}>
                                                            {notification.title}
                                                        </h5>
                                                        <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <span className="text-[10px] font-bold text-slate-400/80">
                                                            {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <div className="w-10 h-10 rounded-2xl bg-slate-100/50 animate-pulse" />
                    )}

                    {/* Order Type Potion Button */}
                    {mounted ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-10 gap-2 rounded-2xl px-4 border-none shadow-md transition-all active:scale-95 font-black text-[11px] uppercase tracking-wider",
                                        currentType.bg, currentType.color,
                                        "ring-1 ring-black/5 hover:ring-orange-200"
                                    )}
                                >
                                    <TypeIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                                    <span>
                                        <span className="max-sm:hidden">{currentType.label}</span>
                                        {orderType === 'dine_in' && tableNumber ? (
                                            <>
                                                <span className="max-sm:hidden mx-1.5 opacity-50">•</span>
                                                <span className="bg-white/20 px-1.5 py-0.5 rounded-md">T-{tableNumber}</span>
                                            </>
                                        ) : (
                                            <span className="sm:hidden">{currentType.label.charAt(0)}</span>
                                        )}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl shadow-2xl border-white/20 bg-white/95 backdrop-blur-2xl">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 h-8 flex items-center">
                                    Order Preference
                                </DropdownMenuLabel>
                                <div className="space-y-1">
                                    {(Object.entries(orderTypeConfig) as [OrderType, any][]).map(([key, config]) => (
                                        <DropdownMenuItem
                                            key={key}
                                            onClick={() => setOrderType(key)}
                                            className={cn(
                                                "gap-3 p-3 rounded-xl cursor-pointer transition-all focus:bg-slate-100 group",
                                                orderType === key && "bg-slate-50 ring-1 ring-slate-100"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-xl transition-colors", config.bg, config.color)}>
                                                <config.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900">{config.label}</span>
                                                <span className="text-[10px] text-slate-500">Pick this for {config.label.toLowerCase()} orders</span>
                                            </div>
                                            {orderType === key && (
                                                <Check className="w-4 h-4 ml-auto text-green-600" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="h-10 w-32 bg-slate-100 rounded-2xl animate-pulse" />
                    )}
                </div>
            </div>
        </header>
    )
}
