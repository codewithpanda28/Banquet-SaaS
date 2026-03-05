'use server'

import { supabase } from '@/lib/supabase'
import { Coupon } from '@/types'

export async function validateCoupon(code: string, cartTotal: number) {
    try {
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single()

        if (error || !coupon) {
            return { error: 'Invalid coupon code' }
        }

        const now = new Date()
        const validFrom = new Date(coupon.valid_from)
        const validUntil = new Date(coupon.valid_until)

        if (now < validFrom || now > validUntil) {
            return { error: 'Coupon is expired' }
        }

        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return { error: 'Coupon usage limit reached' }
        }

        if (cartTotal < coupon.min_order_amount) {
            return { error: `Minimum order amount of ₹${coupon.min_order_amount} required` }
        }

        return { coupon: coupon as Coupon }
    } catch (err) {
        console.error('Coupon validation error:', err)
        return { error: 'Failed to validate coupon' }
    }
}

export async function incrementCouponUsage(couponId: string) {
    try {
        // Fetch current count first to increment safely
        const { data: coupon } = await supabase
            .from('coupons')
            .select('used_count')
            .eq('id', couponId)
            .single()

        if (coupon) {
            await supabase
                .from('coupons')
                .update({ used_count: (coupon.used_count || 0) + 1 })
                .eq('id', couponId)
        }
    } catch (err) {
        console.error('Failed to increment coupon usage:', err)
    }
}

export async function getAvailableCoupons(restaurantId: string) {
    try {
        const now = new Date().toISOString()
        const rid = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''

        console.log('🎟️ [Coupon] Fetching coupons for restaurant:', rid, 'at time:', now)

        const { data: coupons, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('restaurant_id', rid)
            .eq('is_active', true)
            .lte('valid_from', now)   // Start date already passed
            .gte('valid_until', now)  // Not expired yet
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ [Coupon] Error fetching coupons:', error)
            return []
        }

        console.log('✅ [Coupon] Found coupons:', coupons?.length || 0)

        // Usage limit filter — 0 means unlimited
        return (coupons || []).filter(c =>
            c.usage_limit === 0 || c.used_count < c.usage_limit
        ) as Coupon[]
    } catch (err) {
        console.error('❌ [Coupon] Failed to get available coupons:', err)
        return []
    }
}

