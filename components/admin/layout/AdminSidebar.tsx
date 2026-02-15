'use client'

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
    Smartphone,
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

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen glass-sidebar bg-background/80 transition-all duration-300',
                sidebarOpen ? 'w-64' : 'w-20'
            )}
        >
            {/* Logo & Toggle */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
                {sidebarOpen && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
                            Restaurant
                        </span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="ml-auto hover:bg-primary/10 hover:text-primary rounded-full"
                >
                    {sidebarOpen ? (
                        <ChevronLeft className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="space-y-2 p-3 mt-2">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                                isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                !sidebarOpen && 'justify-center'
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                            {sidebarOpen && (
                                <span className={cn("animate-in fade-in slide-in-from-left-2 duration-200")}>
                                    {item.label}
                                </span>
                            )}
                            {isActive && sidebarOpen && (
                                <div className="absolute right-0 top-0 h-full w-1 bg-white/20 blur-sm" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
