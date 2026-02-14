import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { Toaster } from '@/components/ui/sonner'
import { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <AdminLayout>
            {children}
            <Toaster />
        </AdminLayout>
    )
}
