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
                'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
                sidebarOpen ? 'w-64' : 'w-20'
            )}
        >
            {/* Logo & Toggle */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
                {sidebarOpen && (
                    <div className="flex items-center gap-2">
                        <Store className="h-6 w-6 text-primary" />
                        <span className="text-lg font-bold">Restaurant</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="ml-auto hover:bg-sidebar-accent"
                >
                    {sidebarOpen ? (
                        <ChevronLeft className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 p-3">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                                !sidebarOpen && 'justify-center'
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
