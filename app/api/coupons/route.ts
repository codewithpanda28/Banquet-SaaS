import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for bypassing RLS if available, else use anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET: List all available coupons for a restaurant
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const now = new Date().toISOString()

        console.log('🎟️ [API/Coupons] Fetching coupons for restaurant:', restaurantId, 'at time:', now)

        const { data: coupons, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .lte('valid_from', now)
            .gte('valid_until', now)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ [API/Coupons] Supabase error:', error)
            return NextResponse.json({ error: error.message, coupons: [] }, { status: 500 })
        }

        console.log('✅ [API/Coupons] Raw coupons found:', coupons?.length || 0)

        const phone = searchParams.get('phone') || ''
        const last4 = phone.slice(-4)

        // Filter by usage limit and SMART HIDE private/loyal coupons
        const available = (coupons || []).filter((c: any) => {
            const isUsageOk = c.usage_limit === 0 || c.used_count < c.usage_limit
            const isPrivate = c.description?.includes('[PRIVATE]')
            
            // If it's private, ONLY show it if the phone matches the code suffix
            if (isPrivate) {
                if (!phone || !c.code.startsWith('VIP-')) return false
                const codeParts = c.code.split('-')
                const codeSuffix = codeParts[codeParts.length - 1]
                return codeSuffix === last4
            }

            // Normal/Public coupons are shown to everyone
            return isUsageOk
        })

        console.log('✅ [API/Coupons] Available after smart filter:', available.length)
        return NextResponse.json({ coupons: available })
    } catch (err: any) {
        console.error('❌ [API/Coupons] Unexpected error:', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch coupons', coupons: [] }, { status: 500 })
    }
}

// POST: Validate a specific coupon code before applying
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { code, cartTotal, restaurantId: rid } = body

        if (!code) {
            return NextResponse.json({ error: 'Coupon code required' }, { status: 400 })
        }

        const restaurantId = rid || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''
        const supabase = createClient(supabaseUrl, supabaseKey)
        const now = new Date()

        console.log('🎟️ [API/Coupons/Validate] code:', code.toUpperCase(), '| rid:', restaurantId, '| cartTotal:', cartTotal)

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .eq('restaurant_id', restaurantId)
            .single()

        if (error || !coupon) {
            console.log('❌ [API/Coupons/Validate] Not found:', error?.message)
            return NextResponse.json({ error: 'Invalid coupon code' })
        }

        // Date validity check
        const validFrom = new Date(coupon.valid_from)
        const validUntil = new Date(coupon.valid_until)

        if (now < validFrom || now > validUntil) {
            return NextResponse.json({ error: 'Coupon is expired or not yet active' })
        }

        // Usage limit check (0 = unlimited)
        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return NextResponse.json({ error: 'Coupon usage limit reached' })
        }

        // Min order amount check
        if (cartTotal !== undefined && cartTotal < coupon.min_order_amount) {
            return NextResponse.json({ error: `Minimum order amount ₹${coupon.min_order_amount} required` })
        }

        // Extra Security: Private/Loyal coupon check
        const isPrivate = coupon.description?.includes('[PRIVATE]')
        if (isPrivate) {
            // If it's a VIP-NAME-PHONE format, verify phone
            if (coupon.code.startsWith('VIP-')) {
                const codeParts = coupon.code.split('-')
                const codePhonePart = codeParts[codeParts.length - 1] // Last digits
                
                const customerPhone = body.customerPhone || ''
                if (!customerPhone) {
                    return NextResponse.json({ error: 'Please enter your phone number to use this exclusive coupon' })
                }

                const last4OfCustomer = customerPhone.slice(-4)
                if (codePhonePart !== last4OfCustomer) {
                    console.log(`❌ [API/Coupons/Validate] Unauthorized loyal coupon use: code digits ${codePhonePart} vs customer ${last4OfCustomer}`)
                    return NextResponse.json({ error: 'This exclusive coupon belongs to another customer' })
                }
            }
        }

        console.log('✅ [API/Coupons/Validate] Valid! Returning coupon:', coupon.code)
        return NextResponse.json({ coupon })
    } catch (err: any) {
        console.error('❌ [API/Coupons/Validate] Error:', err)
        return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
    }
}
