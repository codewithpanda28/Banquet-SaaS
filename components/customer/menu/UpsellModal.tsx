'use client'

import React, { useEffect, useState } from 'react'
import { MenuItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { X, Sparkles, Plus, ChefHat, Flame, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface UpsellSuggestion {
    item: MenuItem
    message: string
}

interface UpsellModalProps {
    triggerItemId: string | null
    restaurantId: string
    onClose: () => void
}

export function UpsellModal({ triggerItemId, restaurantId, onClose }: UpsellModalProps) {
    const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([])
    const [loading, setLoading] = useState(true)
    const { addItem } = useCartStore()

    useEffect(() => {
        if (!triggerItemId || !restaurantId) {
            setLoading(false)
            return
        }
        fetchSuggestions()
    }, [triggerItemId, restaurantId])

    async function fetchSuggestions() {
        if (!restaurantId) return
        setLoading(true)
        try {
            // Get current cart items
            const cartItems = useCartStore.getState().items
            const cartItemIds = cartItems.map(i => i.id)

            let suggestionsList: UpsellSuggestion[] = []
            const addedItemIds = new Set<string>(cartItemIds)

            // --- SMART BIDIRECTIONAL LOGIC ---
            // If Rule A -> B exists, and B is added to cart, suggest A.
            // This satisfies the user's request: "Ice cream add kiya to rasmalai uper aana chahiye" 
            // even if the rule is "Rasmalai -> Ice Cream".

            // 1. PHASE 1: Direct & Reverse Rules for the TRIGGER ITEM (Absolute Priority)
            if (triggerItemId) {
                // Fetch rules where triggerItemId is EITHER the trigger or the suggestion
                const { data: triggerRules } = await supabase
                    .from('upsell_rules')
                    .select(`
                        id,
                        message,
                        trigger_item_id,
                        suggest_item_id,
                        trigger:menu_items!trigger_item_id (*),
                        suggest:menu_items!suggest_item_id (*)
                    `)
                    .eq('restaurant_id', restaurantId)
                    .or(`trigger_item_id.eq.${triggerItemId},suggest_item_id.eq.${triggerItemId}`)
                    .eq('is_active', true)
                    .order('priority', { ascending: true })

                if (triggerRules && triggerRules.length > 0) {
                    triggerRules.forEach(r => {
                        // If triggerItemId is the 'trigger', suggest the 'suggest_item'
                        // If triggerItemId is the 'suggest_item', suggest the 'trigger'
                        const isDirectMatch = r.trigger_item_id === triggerItemId
                        const suggestedItemRaw = isDirectMatch ? r.suggest : r.trigger
                        const item = Array.isArray(suggestedItemRaw) ? suggestedItemRaw[0] : suggestedItemRaw

                        if (item && item.is_available && !addedItemIds.has(item.id)) {
                            suggestionsList.push({
                                item: item as MenuItem,
                                message: r.message || (isDirectMatch ? "Goes perfectly with your meal! 🍽️" : "Goes great with your selection! ✨")
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            // 2. PHASE 2: Rules for OTHER items CURRENTLY IN CART (Including Reverse)
            const otherCartItemIds = cartItemIds.filter(id => id !== triggerItemId)
            if (otherCartItemIds.length > 0) {
                const { data: cartRules } = await supabase
                    .from('upsell_rules')
                    .select(`
                        id,
                        message,
                        trigger_item_id,
                        suggest_item_id,
                        trigger:menu_items!trigger_item_id (*),
                        suggest:menu_items!suggest_item_id (*)
                    `)
                    .eq('restaurant_id', restaurantId)
                    .or(`trigger_item_id.in.(${otherCartItemIds.join(',')}),suggest_item_id.in.(${otherCartItemIds.join(',')})`)
                    .eq('is_active', true)
                    .order('priority', { ascending: true })

                if (cartRules && cartRules.length > 0) {
                    cartRules.forEach(r => {
                        // Check which cart item matches which side of the rule
                        const matchingCartId = otherCartItemIds.find(cid => cid === r.trigger_item_id || cid === r.suggest_item_id)
                        const isDirectMatch = matchingCartId === r.trigger_item_id
                        const suggestedItemRaw = isDirectMatch ? r.suggest : r.trigger
                        const item = Array.isArray(suggestedItemRaw) ? suggestedItemRaw[0] : suggestedItemRaw

                        if (item && item.is_available && !addedItemIds.has(item.id)) {
                            suggestionsList.push({
                                item: item as MenuItem,
                                message: r.message || "Goes perfectly with your meal! 🍽️"
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            // 3. PHASE 3: Other MANUAL RULES for this restaurant (Global Suggestions)
            if (suggestionsList.length < 8) {
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
                            suggestionsList.push({
                                item: item as MenuItem,
                                message: r.message || "Customers' top choice! ⭐"
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            // 4. PHASE 4: Bestsellers Filler
            if (suggestionsList.length < 5) {
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
                            suggestionsList.push({
                                item: item as MenuItem,
                                message: "Best Seller! 🏆"
                            })
                            addedItemIds.add(item.id)
                        }
                    })
                }
            }

            // Final safety filter and limit to 10
            setSuggestions(suggestionsList.slice(0, 10))
        } catch (err) {
            console.error('❌ [UpsellModal] Error:', err)
            setSuggestions([])
        } finally {
            setLoading(false)
        }
    }

    const handleAddSuggestion = (suggestion: UpsellSuggestion) => {
        addItem(suggestion.item, 1, '')
        toast.success(
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-bold">{suggestion.item.name} added! 🎉</span>
            </div>
        )
        onClose()
    }

    // Don't render anything if loading or no suggestions
    if (loading || suggestions.length === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="w-full max-w-lg bg-white rounded-t-[2rem] overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative px-5 pt-5 pb-3">
                        {/* Drag handle */}
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-base leading-tight">
                                        People Also Order!
                                    </h3>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        Make your meal complete 🍽️
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="px-4 pb-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {suggestions.map((suggestion, index) => {
                            const price = suggestion.item.discounted_price || suggestion.item.price
                            const hasDiscount = !!suggestion.item.discounted_price
                            return (
                                <motion.div
                                    key={suggestion.item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                    className="flex items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-2xl p-3 group hover:border-orange-300 hover:bg-orange-50 transition-all"
                                >
                                    {/* Item Image or Icon */}
                                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                                        {suggestion.item.image_url ? (
                                            <img
                                                src={suggestion.item.image_url}
                                                alt={suggestion.item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-orange-100">
                                                <ChefHat className="h-7 w-7 text-orange-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            {/* Veg/Non-veg dot */}
                                            <div className={`h-2.5 w-2.5 rounded-sm border-[1.5px] flex items-center justify-center ${suggestion.item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                                                <div className={`h-1.5 w-1.5 rounded-full ${suggestion.item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                            </div>
                                            <h4 className="font-black text-sm text-gray-900 truncate">
                                                {suggestion.item.name}
                                            </h4>
                                            {suggestion.item.is_bestseller && (
                                                <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />
                                            )}
                                        </div>

                                        <p className="text-[11px] text-gray-500 font-medium line-clamp-1 mb-1.5">
                                            {suggestion.message || `Goes perfectly with your order!`}
                                        </p>

                                        <div className="flex items-center gap-2 hidden">
                                            <span className="font-black text-orange-600 text-sm">₹{price}</span>
                                            {hasDiscount && (
                                                <span className="text-[10px] text-gray-400 line-through">₹{suggestion.item.price}</span>
                                            )}
                                            {hasDiscount && (
                                                <Badge className="bg-green-100 text-green-700 border-0 text-[9px] px-1.5 py-0 h-4">
                                                    DEAL
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Add Button */}
                                    <button
                                        onClick={() => handleAddSuggestion(suggestion)}
                                        className="h-9 w-9 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 transition-all flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0"
                                    >
                                        <Plus className="h-5 w-5 text-white" />
                                    </button>
                                </motion.div>
                            )
                        })}

                        {/* Skip button */}
                        <button
                            onClick={onClose}
                            className="w-full text-center text-xs text-gray-400 font-semibold py-1 hover:text-gray-600 transition-colors"
                        >
                            No thanks, continue to cart →
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
