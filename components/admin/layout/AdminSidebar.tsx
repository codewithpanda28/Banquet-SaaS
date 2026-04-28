'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/store/adminStore'
import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    Armchair,
    Users,
    Gift,
    TicketPercent,
    FileBarChart,
    Settings,
    ChevronLeft,
    ChevronRight,
    Store,
    Smartphone,
    Monitor,
    ConciergeBell,
    CalendarCheck,
    Star,
    Package,
    Box,
    Bike,
    Zap,
    BarChart3,
    ChefHat,
    Crown,
    HelpCircle,
    Share2,
    ReceiptText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, getRestaurantId } from '@/lib/supabase'

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
    { icon: UtensilsCrossed, label: 'Menu', href: '/admin/menu' },
    { icon: ReceiptText, label: 'Order History', href: '/admin/bills' },
    { icon: Armchair, label: 'Tables', href: '/admin/tables' },
    { icon: Users, label: 'Customers', href: '/admin/customers' },
    { icon: FileBarChart, label: 'Reports', href: '/admin/reports' },
    { icon: Monitor, label: 'App Previews', href: '/admin/preview' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
    { icon: HelpCircle, label: 'Support HQ', href: '/admin/support', color: 'text-indigo-600' },
]

const automationItems = [
    { icon: CalendarCheck, label: 'Table Booking', href: '/admin/bookings', color: 'text-blue-500' },
    { icon: ChefHat, label: 'Kitchen Dashboard', href: '/kitchen', color: 'text-orange-600' },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { sidebarOpen, toggleSidebar } = useAdminStore()

    const [mounted, setMounted] = useState(false)
    const [restaurant, setRestaurant] = useState<any>(null)

    useEffect(() => {
        setMounted(true)
        fetchBranding()
    }, [])

    async function fetchBranding() {
        const rid = getRestaurantId()
        const { data } = await supabase.from('restaurants').select('name, logo_url').eq('id', rid).single()
        if (data) setRestaurant(data)
    }

    if (!mounted) return null

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col glass-sidebar bg-white border-r border-gray-100 shadow-xl',
                sidebarOpen ? 'w-64' : 'w-20'
            )}
        >
            {/* Logo & Toggle */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
                {sidebarOpen ? (
                    <div className="flex items-center gap-3 animate-in fade-in duration-300">
                        <div className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center overflow-hidden transition-all shadow-md",
                            !restaurant?.logo_url && "bg-green-600 shadow-green-500/20 text-white"
                        )}>
                            {restaurant?.logo_url ? (
                                <img src={restaurant.logo_url} className="h-full w-full object-cover" alt="Logo" />
                            ) : (
                                <Store className="h-6 w-6" />
                            )}
                        </div>
                        <span className="text-sm font-black tracking-tight text-gray-900 truncate max-w-[120px]">
                            {restaurant?.name || 'TastyBytes'}
                        </span>
                    </div>
                ) : (
                    <div className="mx-auto">
                        <div className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center overflow-hidden transition-all shadow-md",
                            !restaurant?.logo_url && "bg-green-600 shadow-green-500/20 text-white"
                        )}>
                             {restaurant?.logo_url ? (
                                <img src={restaurant.logo_url} className="h-full w-full object-cover" alt="Logo" />
                            ) : (
                                <Store className="h-6 w-6" />
                            )}
                        </div>
                    </div>
                )}

                {sidebarOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 mt-2 overflow-y-auto custom-scrollbar space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300 group relative overflow-hidden',
                                isActive
                                    ? 'bg-green-50 text-green-700 font-bold shadow-sm'
                                    : 'text-gray-500 hover:bg-green-50 hover:text-green-600',
                                !sidebarOpen && 'justify-center px-2'
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600 rounded-r-full" />}
                            <Icon className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-300",
                                isActive ? "scale-110" : "group-hover:scale-110"
                            )} />
                            {sidebarOpen && (
                                <span className={cn("truncate", isActive && "font-bold")}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}

                {/* Automation Section */}
                {sidebarOpen && (
                    <div className="pt-3 pb-1">
                        <div className="flex items-center gap-2 px-3 mb-2">
                            <div className="h-px flex-1 bg-gray-100" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Automation</span>
                            <div className="h-px flex-1 bg-gray-100" />
                        </div>
                    </div>
                )}
                {!sidebarOpen && <div className="pt-2 pb-1 border-t border-gray-100 mx-1" />}

                {automationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group relative overflow-hidden',
                                isActive
                                    ? 'bg-gray-900 text-white font-bold shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                                !sidebarOpen && 'justify-center px-2'
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700 rounded-r-full" />}
                            <Icon className={cn(
                                "h-4 w-4 shrink-0 transition-transform duration-300",
                                isActive ? cn("scale-110 text-white") : cn("group-hover:scale-110", item.color)
                            )} />
                            {sidebarOpen && (
                                <span className={cn("truncate text-xs", isActive && "font-bold")}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse Button (Desktop only when closed to re-open easily) */}
            {!sidebarOpen && (
                <div className="p-3 border-t border-gray-100 mt-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="w-full h-10 flex justify-center text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            )}
        </aside>
    )
}
