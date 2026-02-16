
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
    try {
        const { orderId, items } = await request.json()

        if (!orderId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        const lowStockAlerts: { id: string; name: string; remaining: number }[] = []

        // Process each item to deduct stock
        for (const item of items) {
            if (!item.menu_item_id || !item.quantity) continue

            // 1. Get current stock
            const { data: menuItem, error: fetchError } = await supabase
                .from('menu_items')
                .select('stock, name, id, is_infinite_stock')
                .eq('id', item.menu_item_id)
                .single()

            if (fetchError || !menuItem) {
                console.error(`Error fetching item ${item.menu_item_id}:`, fetchError)
                continue
            }

            // If stock is infinite, skip deduction and alerts
            if (menuItem.is_infinite_stock) {
                continue
            }

            // 2. Calculate new stock
            const currentStock = menuItem.stock || 0
            const newStock = Math.max(0, currentStock - item.quantity)

            // 3. Update stock
            const { error: updateError } = await supabase
                .from('menu_items')
                .update({ stock: newStock })
                .eq('id', item.menu_item_id)

            if (updateError) {
                console.error(`Error updating stock for ${menuItem.name}:`, updateError)
                continue
            }

            // 4. Check for low stock (threshold: 10)
            if (newStock <= 10) {
                lowStockAlerts.push({
                    id: menuItem.id,
                    name: menuItem.name,
                    remaining: newStock
                })
            }
        }

        // 5. If there are low stock items, create a notification (or you could send an email/SMS here)
        // For now, we'll return them in the response so the frontend can show a toast if needed,
        // or insert into a 'notifications' table if you have one.
        if (lowStockAlerts.length > 0) {
            console.log('Low Stock Alerts:', lowStockAlerts)
            // Optional: Insert into notifications table
            // await supabase.from('notifications').insert(...)
        }

        return NextResponse.json({
            success: true,
            message: 'Stock updated successfully',
            lowStockAlerts
        })

    } catch (error) {
        console.error('Error processing order:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
