'use client'

import React, { useEffect, useState } from 'react'
import { MenuItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { Plus, ChefHat, Sparkles, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

interface UpsellListProps {
    restaurantId: string
    limit?: number
    title?: string
}

export function UpsellList({ restaurantId, limit = 5, title = "Complete Your Meal" }: UpsellListProps) {
    const [suggestions, setSuggestions] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const { items, addItem } = useCartStore()

    useEffect(() => {
        if (!restaurantId || items.length === 0) {
            setLoading(false)
            return
        }
        fetchSuggestions()
    }, [restaurantId, items.length])

    async function fetchSuggestions() {
        setLoading(true)
        try {
            // Get all IDs in cart to avoid suggesting what's already there
            const cartItemIds = items.map(i => i.id)

            // 1. Get rules based on items in cart
            const { data: rules } = await supabase
                .from('upsell_rules')
                .select('suggest_item_id')
                .eq('restaurant_id', restaurantId)
                .in('trigger_item_id', cartItemIds)
                .eq('is_active', true)
                .limit(10)

            let suggestIds: string[] = []
            if (rules && rules.length > 0) {
                suggestIds = rules.map(r => r.suggest_item_id)
            }

            // 2. If no rules, get some bestsellers
            if (suggestIds.length === 0) {
                const { data: bestsellers } = await supabase
                    .from('menu_items')
                    .select('id')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_bestseller', true)
                    .eq('is_available', true)
                    .limit(5)

                if (bestsellers) suggestIds = bestsellers.map(b => b.id)
            }

            // Filter out items already in cart
            const filteredIds = suggestIds.filter(id => !cartItemIds.includes(id))

            if (filteredIds.length === 0) {
                setSuggestions([])
                return
            }

            // 3. Fetch item details
            const { data: menuItems } = await supabase
                .from('menu_items')
                .select('*')
                .in('id', filteredIds.slice(0, limit))
                .eq('is_available', true)

            setSuggestions(menuItems || [])
        } catch (err) {
            console.error('❌ [UpsellList] Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = (item: MenuItem) => {
        addItem(item, 1, '')
        toast.success(
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-bold">{item.name} added! 🎉</span>
            </div>
        )
    }

    if (loading || suggestions.length === 0) return null

    return (
        <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-8 bg-orange-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-hide snap-x">
                {suggestions.map((item) => (
                    <motion.div
                        key={item.id}
                        whileTap={{ scale: 0.95 }}
                        className="flex-shrink-0 w-48 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 snap-start relative overflow-hidden group"
                    >
                        {/* Background subtle gradient */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/10 pointer-events-none" />

                        {/* Image */}
                        <div className="h-28 w-full rounded-xl overflow-hidden mb-3 bg-slate-50 relative">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ChefHat className="w-10 h-10 text-slate-200" />
                                </div>
                            )}
                            {item.is_bestseller && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-400 text-[8px] font-black uppercase rounded-full shadow-sm">
                                    Bestseller
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                <h4 className="font-bold text-xs text-slate-900 truncate">{item.name}</h4>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-orange-600">₹{item.discounted_price || item.price}</span>
                                    {item.discounted_price && (
                                        <span className="text-[10px] text-slate-400 line-through">₹{item.price}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleAdd(item)}
                                    className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-colors active:scale-90"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
