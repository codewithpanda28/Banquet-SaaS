'use client'

import React, { useEffect } from 'react'
import { Plus, Minus, X, Trash2, ShoppingBag, Ticket, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { validateCoupon, getAvailableCoupons } from '@/actions/coupon'
import { toast } from 'sonner'
import { useState } from 'react'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { UpsellList } from '../menu/UpsellList'
import { useRestaurant } from '@/hooks/useRestaurant'

export function CartSidebar() {
    const { isCartOpen, closeCart } = useUIStore()
    const { restaurant } = useRestaurant()
    const {
        items,
        removeItem,
        updateQuantity,
        getTotal,
        getSubtotal,
        getTax,
        clearCart,
        coupon,
        applyCoupon,
        removeCoupon,
        getDiscount
    } = useCartStore()
    const router = useRouter()

    const [couponCode, setCouponCode] = useState('')
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isCartOpen])

    const subtotal = getSubtotal()
    const tax = getTax()
    const discount = getDiscount()
    const total = getTotal()

    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return

        // Check if already used
        if (useCartStore.getState().isCouponUsed(couponCode)) {
            toast.error('This coupon has already been used', {
                description: 'Each coupon can only be used once per customer.'
            })
            setCouponCode('')
            return
        }

        setVerifying(true)
        const result = await validateCoupon(couponCode, useCartStore.getState().getSubtotal())
        setVerifying(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.coupon) {
            useCartStore.getState().applyCoupon(result.coupon)
            toast.success(`Coupon ${result.coupon.code} applied!`)
            setCouponCode('')
        }
    }

    const handleCheckout = () => {
        closeCart()
        router.push('/customer/checkout')
    }

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-opacity"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 inset-x-0 h-[85vh] sm:h-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-white z-50 shadow-2xl rounded-t-[2rem] sm:rounded-l-[2rem] sm:rounded-tr-none flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50/50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-xl">
                                    <ShoppingBag className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold leading-none">Your Cart</h2>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">{items.length} items</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeCart} className="rounded-full hover:bg-muted active:scale-95 transition-transform">
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-6 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center">
                                        <ShoppingBag className="w-10 h-10 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-foreground">Your cart is empty</p>
                                        <p className="text-sm">Looks like you haven't added anything yet.</p>
                                    </div>
                                    <Button onClick={closeCart} size="lg" className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">
                                        Browse Menu
                                    </Button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <motion.div
                                        layout
                                        key={item.cartId}
                                        className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-orange-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-20 h-20 object-cover rounded-xl bg-secondary shrink-0"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground shrink-0">
                                                <span className="text-xs">No Img</span>
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-base leading-tight truncate pr-4">{item.name}</h3>
                                                    <span className="font-bold text-base whitespace-nowrap">₹{(item.lineTotal).toFixed(0)}</span>
                                                </div>
                                                {/* {item.description && (
                           <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                        )} */}
                                                {item.instructions && (
                                                    <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-medium text-amber-900 border border-amber-100 max-w-full truncate">
                                                        Note: {item.instructions}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-1 border border-secondary">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                                        className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-primary hover:text-primary/80 active:scale-90 transition-all"
                                                    >
                                                        <Minus className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                                        className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-primary hover:text-primary/80 active:scale-90 transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    onClick={() => removeItem(item.cartId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}

                            {items.length > 0 && restaurant?.id && (
                                <div className="pt-2">
                                    <UpsellList
                                        restaurantId={restaurant.id}
                                        limit={3}
                                        title="Frequently Ordered Together"
                                    />
                                </div>
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="p-6 bg-white border-t space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-muted-foreground font-medium">
                                        <span>Subtotal</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>


                                    {/* Coupon section removed as per user request */}

                                    <div className="flex justify-between text-muted-foreground font-medium">
                                        <span>Tax (5%)</span>
                                        <span>₹{tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-black text-xl pt-2 border-t border-dashed mt-2 text-primary">
                                        <span>Total</span>
                                        <span>₹{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-orange-200 hover:shadow-orange-300 active:scale-[0.98] transition-all bg-orange-500 hover:bg-orange-600 text-white border border-orange-600"
                                    onClick={handleCheckout}
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
