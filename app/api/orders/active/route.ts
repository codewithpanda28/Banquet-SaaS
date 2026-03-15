
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

        const rid = restaurantId === 'null' ? null : restaurantId
        const tid = (tableId === 'null' || !tableId) ? null : tableId
        const cid = (customerId === 'null' || !customerId) ? null : customerId
        const tnum = (tableNumber === 'null' || !tableNumber) ? null : tableNumber

        if (!rid) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })

        // Build base query
        let query = supabaseAdmin
            .from('orders')
            .select('id, bill_id, total, subtotal, status, payment_status, table_id, customer_id')
            .eq('restaurant_id', rid)
            .eq('payment_status', 'pending')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })

        if (cid) {
            // STRICT MATCH: If customer info is provided, we ONLY match their specific order
            // This prevents merging different customers on the same table.
            query = query.eq('customer_id', cid)
        } else {
            // LOOSE MATCH (Walk-in): Match by table primarily
            // If no customer details are provided, we assume additions to the latest table order.
            if (tid) {
                query = query.eq('table_id', tid)
            } else if (tnum && !isNaN(parseInt(tnum))) {
                query = query.eq('table_number', parseInt(tnum))
            } else {
                return NextResponse.json({ order: null })
            }
        }

        // We use maybeSingle to get at most one active order
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
