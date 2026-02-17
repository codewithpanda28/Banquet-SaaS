'use client'

import React from 'react'
import { Plus, Minus, Flame, Crown, Sparkles, ChefHat } from 'lucide-react'
import { MenuItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MenuItemCardProps {
    item: MenuItem
    onAdd: () => void
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
    const { items, addItem, updateQuantity } = useCartStore()

    const cartItems = items.filter(i => i.id === item.id)
    const quantity = cartItems.reduce((acc, i) => acc + i.quantity, 0)

    const handleIncrement = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (cartItems.length > 1) {
            onAdd()
        } else if (cartItems.length === 1) {
            updateQuantity(cartItems[0].cartId, cartItems[0].quantity + 1)
        } else {
            addItem(item, 1, '')
        }
    }

    const handleDecrement = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (cartItems.length > 1) {
            onAdd()
        } else if (cartItems.length === 1) {
            updateQuantity(cartItems[0].cartId, cartItems[0].quantity - 1)
        }
    }

    const handleAddStart = (e: React.MouseEvent) => {
        e.stopPropagation()
        onAdd()
    }

    return (
        <div
            onClick={onAdd}
            className="group relative flex bg-white rounded-[20px] p-3 shadow-sm border border-black/5 active:scale-[0.98] transition-all duration-300 overflow-hidden cursor-pointer w-full gap-4"
        >
            {/* Image Section */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden shadow-inner bg-secondary/30">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ChefHat className="w-8 h-8 opacity-20" />
                    </div>
                )}
                {/* Badges Overlay */}
                <div className="absolute top-0 left-0 p-1 flex flex-col gap-1">
                    {item.is_bestseller && (
                        <div className="bg-amber-400 text-[8px] font-black text-black px-1.5 py-0.5 rounded-full flex items-center shadow-sm">
                            <Crown size={8} className="mr-0.5" /> BESTSELLER
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-1 py-1 justify-between">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-3 h-3 border rounded-[2px] flex items-center justify-center p-[1px]",
                                item.is_veg ? "border-green-600" : "border-red-600"
                            )}>
                                <div className={cn(
                                    "w-full h-full rounded-full",
                                    item.is_veg ? "bg-green-600" : "bg-red-600"
                                )} />
                            </div>
                            {item.is_spicy && <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />}
                        </div>
                    </div>

                    <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                        {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                        {item.description}
                    </p>
                    <div className="flex items-center gap-2 mb-2 min-h-[20px]">
                        {!item.is_infinite_stock && item.stock !== undefined && item.stock !== null && (
                            <>
                                {item.stock <= 0 ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                                        Sold Out
                                    </span>
                                ) : item.stock < 5 ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 animate-pulse flex items-center gap-1">
                                        Low Stock: {item.stock}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                                        {item.stock} Available
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col">
                        {item.discounted_price ? (
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-muted-foreground line-through decoration-red-500/50">₹{item.price}</span>
                                <span className="font-black text-base">₹{item.discounted_price}</span>
                            </div>
                        ) : (
                            <span className="font-black text-base">₹{item.price}</span>
                        )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                        {quantity > 0 ? (
                            <div className="flex items-center bg-primary text-primary-foreground shadow-lg shadow-primary/30 rounded-lg h-8 overflow-hidden">
                                <button
                                    onClick={handleDecrement}
                                    className="w-8 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors"
                                >
                                    <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                                <button
                                    onClick={handleIncrement}
                                    className="w-8 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleAddStart}
                                disabled={!item.is_infinite_stock && item.stock !== undefined && item.stock !== null && item.stock <= 0}
                                className={cn(
                                    "h-8 px-5 font-bold uppercase text-[10px] tracking-wider shadow-sm transition-all rounded-lg border",
                                    !item.is_infinite_stock && item.stock !== undefined && item.stock !== null && item.stock <= 0
                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-white text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-orange-200"
                                )}
                            >
                                {!item.is_infinite_stock && item.stock !== undefined && item.stock !== null && item.stock <= 0 ? 'Sold Out' : 'Add'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
