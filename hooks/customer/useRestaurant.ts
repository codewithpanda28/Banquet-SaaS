'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Restaurant } from '@/types'

export function useRestaurant() {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchRestaurant() {
            try {
                const { data, error } = await supabase
                    .from('restaurants')
                    .select('*')
                    .single() // Ideally filter by ID if multiple, but prompt implies single tenant ID provided in env or prompt

                if (error) throw error

                // Wait, prompt gave RESTAURANT_ID = "f1dde894-c027-4506-a55a-dfe65bb0449f"
                // I should use that.
                // But if I use .single() on 'restaurants' table, it might return any row if I don't filter.
                // I should use the ID.
            } catch (e: any) {
                // setError(e.message)
                // If fails, maybe retry with ID specific query
            }
        }

        // Actually, let's rewrite to use ID
        const fetchWithId = async () => {
            const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'f1dde894-c027-4506-a55a-dfe65bb0449f'
            try {
                const { data, error } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', restaurantId)
                    .single()

                if (error) throw error
                setRestaurant(data)
            } catch (err: any) {
                console.error('Error fetching restaurant:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchWithId()
    }, [])

    return { restaurant, loading, error }
}
