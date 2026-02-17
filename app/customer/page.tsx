'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CustomerRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tableId = searchParams ? searchParams.get('table') : null
        if (tableId) {
            router.push(`/customer/scan?table=${tableId}`)
        } else {
            router.push('/customer/menu')
        }
    }, [router, searchParams])

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    )
}

export default function CustomerPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        }>
            <CustomerRedirect />
        </Suspense>
    )
}
