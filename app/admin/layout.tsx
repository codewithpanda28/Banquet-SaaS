'use client'

import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Layout({ children }: { children: ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        // Check if user is logged in
        const isLoggedIn = localStorage.getItem('admin_logged_in')

        if (!isLoggedIn) {
            router.push('/login')
        }
    }, [router])

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    )

}
