
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // Initialize admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId')
        const tableId = searchParams.get('tableId')
        const customerId = searchParams.get('customerId')
        const tableNumber = searchParams.get('tableNumber')
        const joinMode = searchParams.get('join') // 'true' or 'false'

        if (!restaurantId) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })

        // Build query
        let query = supabaseAdmin
            .from('orders')
            .select('id, bill_id, total, subtotal, status, payment_status, table_id, customer_id')
            .eq('restaurant_id', restaurantId)
            .eq('payment_status', 'pending')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(1)

        // Modern Logic:
        if (joinMode === 'false' && customerId) {
            // SEPARATE ORDER: Must match BOTH table AND customer
            if (tableId && tableId !== 'null') query = query.eq('table_id', tableId)
            else if (tableNumber && tableNumber !== 'null') query = query.eq('table_number', parseInt(tableNumber))
            
            query = query.eq('customer_id', customerId)
        } else {
            // JOIN MODE (default or true): Match by table primarily
            if (tableId && tableId !== 'null') {
                query = query.eq('table_id', tableId)
            } else if (tableNumber && tableNumber !== 'null' && !isNaN(parseInt(tableNumber))) {
                query = query.eq('table_number', parseInt(tableNumber))
            } else if (customerId && customerId !== 'null') {
                query = query.eq('customer_id', customerId)
            } else {
                return NextResponse.json({ order: null })
            }
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
            console.error('Supabase query error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ order: data })

    } catch (error: any) {
        console.error('API Handler Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
