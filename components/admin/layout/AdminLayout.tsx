'use client'

import { ReactNode } from 'react'
import { useAdminStore } from '@/store/adminStore'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { sidebarOpen } = useAdminStore()

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar />
            <div
                className={cn(
                    'transition-all duration-300',
                    sidebarOpen ? 'ml-64' : 'ml-20'
                )}
            >
                <AdminHeader />
                <main className="p-6">{children}</main>
            </div>
            <Toaster />
        </div>
    )
}
