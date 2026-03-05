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

            let finalItems: (MenuItem & { upsellMessage?: string })[] = []
            const addedItemIds = new Set<string>(cartItemIds)

            // 1. PHASE 1: Rules for items CURRENTLY IN CART (The absolute priority)
            const { data: cartRules } = await supabase
                .from('upsell_rules')
                .select(`
                    id,
                    message,
                    suggest_item:menu_items!suggest_item_id (*)
                `)
                .eq('restaurant_id', restaurantId)
                .in('trigger_item_id', cartItemIds)
                .eq('is_active', true)
                .order('priority', { ascending: true })

            if (cartRules && cartRules.length > 0) {
                cartRules.forEach(r => {
                    const item = Array.isArray(r.suggest_item) ? r.suggest_item[0] : r.suggest_item
                    if (item && item.is_available && !addedItemIds.has(item.id)) {
                        finalItems.push({ ...item, upsellMessage: r.message })
                        addedItemIds.add(item.id)
                    }
                })
            }

            // 2. PHASE 2: Other MANUAL RULES for this restaurant (Global Suggestions)
            if (finalItems.length < 8) {
                const { data: globalRules } = await supabase
                    .from('upsell_rules')
                    .select(`
                        id,
                        message,
                        suggest_item:menu_items!suggest_item_id (*)
                    `)
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true)
                    .limit(10)

                if (globalRules) {
                    globalRules.forEach(r => {
                        const item = Array.isArray(r.suggest_item) ? r.suggest_item[0] : r.suggest_item
                        if (item && item.is_available && !addedItemIds.has(item.id)) {
                            finalItems.push({
                                ...item,
                                upsellMessage: r.message || "Customers' top choice! ⭐"
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            // 3. PHASE 3: Bestsellers Filler
            if (finalItems.length < 5) {
                const exclusionList = Array.from(addedItemIds)
                const { data: bestsellers } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_bestseller', true)
                    .eq('is_available', true)
                    .not('id', 'in', exclusionList.length > 0 ? `(${exclusionList.join(',')})` : '("")')
                    .limit(5)

                if (bestsellers) {
                    bestsellers.forEach(item => {
                        if (!addedItemIds.has(item.id)) {
                            finalItems.push({
                                ...item,
                                upsellMessage: "Our customer favorite! 🏆"
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            setSuggestions(finalItems.slice(0, 10))
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
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <Sparkles className="w-4 h-4 fill-orange-500" />
                </div>
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
                        <div className="h-28 w-full rounded-xl overflow-hidden mb-3 bg-slate-50 relative border border-slate-50">
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
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className={`w-2 h-2 rounded-full ring-2 ring-white shrink-0 ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                <h4 className="font-black text-[11px] text-slate-900 truncate tracking-tight">{item.name}</h4>
                            </div>

                            {(item as any).upsellMessage && (
                                <p className="text-[9px] text-slate-400 font-medium line-clamp-1 italic px-0.5 mt-0.5">
                                    &quot;{(item as any).upsellMessage}&quot;
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-1">
                                <div className="flex flex-col">
                                    <span className="font-black text-xs text-orange-600">₹{item.discounted_price || item.price}</span>
                                    {item.discounted_price && (
                                        <span className="text-[9px] text-slate-400 line-through">₹{item.price}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleAdd(item)}
                                    className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-colors active:scale-90 shadow-sm shadow-black/10"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
