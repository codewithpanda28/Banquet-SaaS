import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Initialize admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseKey = serviceKey || anonKey
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const isServiceKey = !!serviceKey
    console.log(`🔑 [ActiveOrderAPI] Using ${isServiceKey ? 'SERVICE_ROLE' : 'ANON'} key (${supabaseKey.slice(0, 5)}...)`)

    try {
        const { searchParams } = new URL(request.url)
        console.log('📡 [ActiveOrderAPI] Params:', Object.fromEntries(searchParams.entries()))
        const restaurantId = searchParams.get('restaurantId')
        const tableId = searchParams.get('tableId')
        const customerId = searchParams.get('customerId')
        const tableNumber = searchParams.get('tableNumber')
        const join = searchParams.get('join')

        if (join === 'false') {
            return NextResponse.json({ order: null })
        }
        
        const rid = restaurantId === 'null' ? null : restaurantId
        const tid = (tableId === 'null' || !tableId) ? null : tableId
        const cid = (customerId === 'null' || !customerId) ? null : customerId
        const tnum = (tableNumber === 'null' || !tableNumber) ? null : tableNumber

        if (!rid) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })

        console.log(`🔍 [ActiveOrderAPI] Checking for RID: ${rid}, Table: ${tid || tnum}, Customer: ${cid}`)

        // Logic Choice
        if (join === 'false') {
            return NextResponse.json({ order: null })
        }

        // Build query - only include orders from last 24 hours to avoid matching ghost orders 
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        let query = supabaseAdmin
            .from('orders')
            .select('id, bill_id, total, subtotal, status, payment_status, table_id, customer_id')
            .eq('restaurant_id', rid)
            .eq('payment_status', 'pending')
            .neq('status', 'cancelled')
            .gt('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false })
            .limit(1)

        if (join === 'true') {
            // Priority 1: Table Match (Anyone joining this table)
            if (tid) query = query.eq('table_id', tid)
            console.log(`🤝 [ActiveOrderAPI] Search mode: JOIN TABLE (TID: ${tid})`)
        } else if (cid) {
            // Priority 2: Customer Match (Same customer returning)
            query = query.eq('customer_id', cid)
            if (tid) query = query.eq('table_id', tid) // Must also be same table
            console.log(`👤 [ActiveOrderAPI] Search mode: RECURRING CUSTOMER (CID: ${cid}, TID: ${tid})`)
        } else {
            // Fallback: Table only (Walk-ins)
            if (tid) query = query.eq('table_id', tid)
            console.log(`🍽️ [ActiveOrderAPI] Search mode: TABLE ONLY (TID: ${tid})`)
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
            console.error('❌ [ActiveOrderAPI] Query Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (data) {
            console.log(`✅ [ActiveOrderAPI] Found mergeable bill: ${data.bill_id} (ID: ${data.id})`)
        } else {
            console.log('ℹ️ [ActiveOrderAPI] No mergeable bill found.')
        }

        return NextResponse.json({ order: data })

    } catch (error: any) {
        console.error('❌ [ActiveOrderAPI] Crash:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
