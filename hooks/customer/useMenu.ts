import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'

export function useMenu(restaurantId: string | null) {
    const [categories, setCategories] = useState<MenuCategory[]>([])
    const [items, setItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!restaurantId) return

        let channel: any

        async function fetchData(silent = false) {
            try {
                if (!silent) setLoading(true)
                // Groups parallel fetch
                const [catData, itemData] = await Promise.all([
                    supabase
                        .from('menu_categories')
                        .select('*')
                        .eq('restaurant_id', restaurantId)
                        .eq('is_active', true)
                        .order('sort_order', { ascending: true }),
                    supabase
                        .from('menu_items')
                        .select('*')
                        .eq('restaurant_id', restaurantId)
                        .eq('is_available', true)
                ])

                if (catData.error) throw catData.error
                if (itemData.error) throw itemData.error

                setCategories(catData.data || [])
                setItems(itemData.data || [])
            } catch (err: any) {
                console.error('Error fetching menu:', err)
                setError(err.message)
            } finally {
                if (!silent) setLoading(false)
            }
        }

        fetchData()

        channel = supabase.channel(`menu-realtime-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurantId}` },
                () => fetchData(true)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_categories', filter: `restaurant_id=eq.${restaurantId}` },
                () => fetchData(true)
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId])

    return { categories, items, loading, error }
}
