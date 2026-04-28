'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertTriangle, CheckCircle, Armchair, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface TableInfo {
    id: string
    table_number: number
    table_name: string
    capacity: number
    status: string
}

function ScanRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tableNumber = searchParams.get('table')
        const tenantId = searchParams.get('id')

        if (!tableNumber || !tenantId) {
            router.replace('/customer/menu')
            return
        }

        handleTableScan(parseInt(tableNumber), tenantId)
    }, [])

    async function handleTableScan(tableNumber: number, tenantId: string) {
        try {
            // Verify if the table exists
            const { data: tableData, error } = await supabase
                .from('restaurant_tables')
                .select('id')
                .eq('restaurant_id', tenantId)
                .eq('table_number', tableNumber)
                .single()

            if (error || !tableData) {
                router.replace(`/customer/menu?table=${tableNumber}&id=${tenantId}`)
                return
            }

            // Simple redirect to menu without marking anything as occupied
            setTimeout(() => {
                router.replace(`/customer/menu?table=${tableNumber}&id=${tenantId}&type=dine_in&tableId=${tableData.id}`)
            }, 800)

        } catch (err) {
            console.error('Table scan error:', err)
            router.replace(`/customer/menu?table=${tableNumber}`)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-5 bg-gradient-to-b from-orange-50 to-white px-4">
            <div className="relative">
                <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />
                </div>
                <div className="absolute inset-0 rounded-full bg-orange-400/10 blur-2xl" />
            </div>
            <div className="text-center">
                <p className="font-black text-xl text-gray-900">
                    Table Verified! 🎉
                </p>
                <p className="text-gray-500 text-sm mt-1 font-medium">
                    Menu khul raha hai...
                </p>
            </div>
        </div>
    )
}

export default function ScanPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-orange-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        }>
            <ScanRedirect />
        </Suspense>
    )
}
