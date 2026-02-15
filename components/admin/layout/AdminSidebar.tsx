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
    TicketPercent,
    FileBarChart,
    Settings,
    ChevronLeft,
    ChevronRight,
    Store,
    Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
    { icon: UtensilsCrossed, label: 'Menu', href: '/admin/menu' },
    { icon: Armchair, label: 'Tables', href: '/admin/tables' },
    { icon: Users, label: 'Customers', href: '/admin/customers' },
    { icon: TicketPercent, label: 'Coupons', href: '/admin/coupons' },
    { icon: FileBarChart, label: 'Reports', href: '/admin/reports' },
    { icon: UtensilsCrossed, label: 'Kitchen Display', href: 'http://localhost:3001', external: true },
    { icon: Smartphone, label: 'Customer App', href: 'http://localhost:3002', external: true },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { sidebarOpen, toggleSidebar } = useAdminStore()

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

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
                        <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/20 ring-1 ring-green-600/20">
                            <Store className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-gray-900">
                            TastyBytes
                        </span>
                    </div>
                ) : (
                    <div className="mx-auto">
                        <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/20 ring-1 ring-green-600/20">
                            <Store className="h-5 w-5" />
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
            <nav className="flex-1 space-y-1 p-3 mt-4 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            target={item.external ? '_blank' : undefined}
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
