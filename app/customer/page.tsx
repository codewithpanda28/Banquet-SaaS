'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// This file is being checked, but I will just return the content as is for now if I don't see anything obvious to change here.
// Actually, I'll just keep it as is for now and check other files.
// Wait, I must perform a replacement if I called this tool.
// I will just make it slightly cleaner while I am here.
function CustomerRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tableId = searchParams?.get('table')

        if (tableId) {
            router.push(`/customer/menu?table=${tableId}`)
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
