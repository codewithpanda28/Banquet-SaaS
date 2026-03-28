'use client'

import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Layout({ children }: { children: ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        // 🚀 SaaS Tenant Synchronization
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlId = params.get('id');
            const localId = localStorage.getItem('tenant_id');
            const isLoggedIn = localStorage.getItem('admin_logged_in');

            // Handle URL-based tenant switching (Super Admin Flow)
            if (urlId && urlId !== localId) {
                console.log('🔄 [AdminLayout] New Tenant ID detected in URL. Syncing session...');
                localStorage.setItem('tenant_id', urlId);
                // Clear state of previous tenant
                localStorage.removeItem('admin_logged_in'); 
                window.location.reload(); // Force full refresh for new tenant
                return;
            }

            // Standard Auth Check
            if (!isLoggedIn) {
                console.log('🚫 [AdminLayout] Non-authenticated session. Heading to login...');
                router.push(urlId ? `/login?id=${urlId}` : '/login');
            }
        }
    }, [router])

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    )

}
