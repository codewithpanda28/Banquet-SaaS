'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function ScanRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const table = searchParams.get('table')
        // Redirect directly to menu, bypassing phone number check
        if (table) {
            router.replace(`/customer/menu?table=${table}`)
        } else {
            router.replace('/customer/menu')
        }
    }, [router, searchParams])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading menu...</p>
        </div>
    )
}

export default function ScanPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ScanRedirect />
        </Suspense>
    )
}
