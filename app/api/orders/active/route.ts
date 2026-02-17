
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const tableId = searchParams.get('tableId')
    const customerId = searchParams.get('customerId')
    const tableNumber = searchParams.get('tableNumber')

    // Initialize admin client to bypass RLS
    // Fallback to anon key if service role is missing (though RLS bypassing won't work then)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        // Build query
        // We use 'orders' alias if needed but standard SELECT is fine
        let query = supabaseAdmin
            .from('orders')
            .select('id, bill_id, total, subtotal, status, payment_status, table_id, customer_id')
            .eq('restaurant_id', restaurantId)
            .eq('payment_status', 'pending')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(1)

        // Priority Logic similar to CheckoutPage but simpler
        if (tableId && tableId !== 'null') {
            query = query.eq('table_id', tableId)
        } else if (tableNumber && tableNumber !== 'null' && !isNaN(parseInt(tableNumber))) {
            query = query.eq('table_number', parseInt(tableNumber))
        } else if (customerId && customerId !== 'null') {
            query = query.eq('customer_id', customerId)
        } else {
            // Not enough info to find active order
            return NextResponse.json({ order: null })
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
