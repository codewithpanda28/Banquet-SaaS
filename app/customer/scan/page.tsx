'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertTriangle, CheckCircle, Armchair, ChevronRight } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
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
    const [status, setStatus] = useState<'checking' | 'occupied' | 'redirecting'>('checking')
    const [occupiedTable, setOccupiedTable] = useState<TableInfo | null>(null)
    const [alternateTables, setAlternateTables] = useState<TableInfo[]>([])

    useEffect(() => {
        const tableNumber = searchParams.get('table')

        // Agar table param nahi hai to seedha menu pe bhejo
        if (!tableNumber) {
            router.replace('/customer/menu')
            return
        }

        handleTableScan(parseInt(tableNumber))
    }, [])

    async function handleTableScan(tableNumber: number) {
        try {
            // Step 1: Table number se table data fetch karo
            const { data: tableData, error } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('table_number', tableNumber)
                .single()

            if (error || !tableData) {
                // Table nahi mili — seedha menu pe bhejo
                router.replace(`/customer/menu?table=${tableNumber}`)
                return
            }

            // Step 2: Check karo kya table already occupied hai
            if (tableData.status === 'occupied') {
                // Table occupied hai — alternate available tables fetch karo
                const { data: availableTables } = await supabase
                    .from('restaurant_tables')
                    .select('*')
                    .eq('restaurant_id', RESTAURANT_ID)
                    .eq('status', 'available')
                    .eq('is_active', true)
                    .order('table_number')

                setOccupiedTable(tableData)
                setAlternateTables(availableTables || [])
                setStatus('occupied')
                return
            }

            // Step 3: Table free hai — OCCUPIED mark karo Supabase mein
            await supabase
                .from('restaurant_tables')
                .update({ status: 'occupied' })
                .eq('id', tableData.id)

            // Step 4: Table bookings mein bhi "walk-in" entry daalo (today's booking)
            await supabase.from('table_bookings').insert({
                restaurant_id: RESTAURANT_ID,
                table_id: tableData.id,
                customer_name: 'Walk-in Customer',
                customer_phone: 'qr-scan',
                party_size: 1,
                booking_date: new Date().toISOString().split('T')[0],
                booking_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                status: 'seated',
                notes: `Auto-seated via QR scan — Table ${tableNumber}`
            })

            // Step 5: Menu pe redirect karo
            setStatus('redirecting')
            setTimeout(() => {
                router.replace(`/customer/menu?table=${tableNumber}&type=dine_in`)
            }, 800)

        } catch (err) {
            console.error('Table scan error:', err)
            // Error pe bhi menu pe bhejo
            router.replace(`/customer/menu?table=${tableNumber}`)
        }
    }

    async function selectAlternateTable(table: TableInfo) {
        // Alternate table choose ki — usse bhi occupied mark karo
        await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied' })
            .eq('id', table.id)

        await supabase.from('table_bookings').insert({
            restaurant_id: RESTAURANT_ID,
            table_id: table.id,
            customer_name: 'Walk-in Customer',
            customer_phone: 'qr-scan',
            party_size: 1,
            booking_date: new Date().toISOString().split('T')[0],
            booking_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: 'seated',
            notes: `Auto-seated via QR scan (alternate) — Table ${table.table_number}`
        })

        router.replace(`/customer/menu?table=${table.table_number}&type=dine_in`)
    }

    // ── Loading State ──
    if (status === 'checking' || status === 'redirecting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-5 bg-gradient-to-b from-orange-50 to-white px-4">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
                        {status === 'redirecting'
                            ? <CheckCircle className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />
                            : <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                        }
                    </div>
                    <div className="absolute inset-0 rounded-full bg-orange-400/10 blur-2xl" />
                </div>
                <div className="text-center">
                    <p className="font-black text-xl text-gray-900">
                        {status === 'redirecting' ? 'Table Booked! 🎉' : 'Table Check ho rahi hai...'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1 font-medium">
                        {status === 'redirecting' ? 'Menu khul raha hai...' : 'Ek second ruko'}
                    </p>
                </div>
            </div>
        )
    }

    // ── Table Occupied State ──
    return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col items-center justify-start pt-16 px-4 pb-10">
            {/* Occupied Icon */}
            <div className="relative mb-6">
                <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <div className="absolute inset-0 rounded-full bg-red-400/10 blur-2xl" />
            </div>

            {/* Message */}
            <h1 className="text-2xl font-black text-gray-900 text-center mb-2">
                Table {occupiedTable?.table_number} Occupied! 🚫
            </h1>
            <p className="text-gray-500 text-center text-sm font-medium mb-8 max-w-xs">
                Yeh table abhi koi aur use kar raha hai. Neeche se koi free table choose karo.
            </p>

            {/* Alternate Tables */}
            {alternateTables.length > 0 ? (
                <div className="w-full max-w-sm space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center mb-4">
                        ✅ Available Tables
                    </p>
                    {alternateTables.map(table => (
                        <button
                            key={table.id}
                            onClick={() => selectAlternateTable(table)}
                            className="w-full bg-white rounded-2xl border-2 border-green-200 hover:border-green-500 hover:bg-green-50 p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.97] shadow-sm"
                        >
                            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center font-black text-xl text-green-700">
                                {table.table_number}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-gray-900">{table.table_name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Armchair className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">{table.capacity} seats</span>
                                    <span className="ml-2 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">FREE</span>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="w-full max-w-sm bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
                    <p className="font-bold text-red-700">Koi bhi table available nahi hai abhi 😔</p>
                    <p className="text-sm text-red-500 mt-1">Thodi der baad try karo ya staff se poochhо</p>
                </div>
            )}
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
