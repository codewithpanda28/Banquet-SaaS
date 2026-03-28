'use client'

import { useEffect, useState } from 'react'
import { supabase, getRestaurantId } from '@/lib/supabase'
import { Restaurant } from '@/types'

export function useRestaurant() {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchWithId = async () => {
            setLoading(true)
            const restaurantId = getRestaurantId()
            
            if (!restaurantId) {
                setLoading(false)
                return
            }

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
        
        // 🔄 Re-fetch if the URL ID changes
        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', fetchWithId);
            return () => window.removeEventListener('popstate', fetchWithId);
        }
    }, [])

    return { restaurant, loading, error }
}
