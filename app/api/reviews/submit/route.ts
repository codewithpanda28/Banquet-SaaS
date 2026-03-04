
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use private service role key for backend operations to bypass RLS if needed,
// but here we can just use the anon key if the policy allows.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const {
            restaurant_id,
            customer_name,
            customer_phone,
            rating,
            feedback
        } = body

        if (!restaurant_id || !customer_name || !rating) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: restaurant_id, customer_name, rating'
            }, { status: 400 })
        }

        // 1. Log the review to the database
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('google_review_link, review_threshold')
            .eq('id', restaurant_id)
            .single()

        const threshold = restaurant?.review_threshold || 4
        const shouldSendGoogle = rating >= threshold

        const { data, error } = await supabase
            .from('review_logs')
            .insert({
                restaurant_id,
                customer_name,
                customer_phone,
                rating,
                feedback,
                google_link_sent: shouldSendGoogle
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            data,
            google_review_triggered: shouldSendGoogle,
            google_link: shouldSendGoogle ? restaurant?.google_review_link : null
        })

    } catch (error: any) {
        console.error('❌ [Review Submit API] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
