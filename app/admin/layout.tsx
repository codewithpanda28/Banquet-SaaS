'use client'

import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Layout({ children }: { children: ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        // ✅ Resilient Session Detection (Cookie + LocalStorage)
        if (typeof window !== 'undefined') {
            const isLoggedIn = localStorage.getItem('admin_logged_in')
            const hasTenantCookie = document.cookie.includes('tenant_id=')

            if (!isLoggedIn && !hasTenantCookie) {
                console.log('🚫 [AdminLayout] Non-authenticated session. Heading to login...')
                router.push('/login')
            }
        }
    }, [router])

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    )

}
