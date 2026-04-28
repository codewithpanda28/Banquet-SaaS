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
        getSGST,
        getCGST,
        clearCart,
        coupon,
        applyCoupon,
        removeCoupon,
        getDiscount,
        setTaxRates
    } = useCartStore()
    const router = useRouter()

    const [couponCode, setCouponCode] = useState('')
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (restaurant) {
            setTaxRates(restaurant.sgst_percentage || 2.5, restaurant.cgst_percentage || 2.5)
        }
    }, [restaurant, setTaxRates])

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
    const sgst = getSGST()
    const cgst = getCGST()
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
                        className="fixed bottom-0 inset-x-0 h-[85vh] sm:h-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-[#FCFBF7] z-50 shadow-2xl rounded-t-[2.5rem] sm:rounded-l-[2.5rem] sm:rounded-tr-none flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-8 border-b border-[#D4AF37]/10 bg-white">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#F4EBD0] p-2.5 rounded-2xl border border-[#D4AF37]/20 shadow-sm">
                                    <ShoppingBag className="w-6 h-6 text-[#8B6508]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Your Selection</h2>
                                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mt-1">{items.length} Offerings</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeCart} className="rounded-full hover:bg-[#F4EBD0]/50 text-[#8B6508]">
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-8 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-white border border-[#D4AF37]/10 rounded-full flex items-center justify-center shadow-inner">
                                        <ShoppingBag className="w-10 h-10 text-[#D4AF37]/20" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-lg font-serif font-bold text-[#1A1A1A]">No selections yet</p>
                                        <p className="text-sm text-[#8B6508]/60">Your event tray is empty. Discover our delicacies.</p>
                                    </div>
                                    <Button onClick={closeCart} size="lg" className="rounded-full px-10 font-black uppercase tracking-widest text-[11px] bg-[#D4AF37] hover:bg-[#B8860B] shadow-xl shadow-[#D4AF37]/20 border-none text-white">
                                        Explore Menu
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item) => (
                                        <motion.div
                                            layout
                                            key={item.cartId}
                                            className="flex gap-4 p-5 bg-white border border-[#D4AF37]/10 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                                        >
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-20 h-20 object-cover rounded-xl bg-secondary shrink-0 border border-[#F4EBD0]"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 bg-[#FCFBF7] border border-[#F4EBD0] rounded-xl flex items-center justify-center text-[#D4AF37]/40 shrink-0">
                                                    <ShoppingBag className="w-6 h-6" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-serif font-bold text-base text-[#1A1A1A] leading-tight pr-4">{item.name}</h3>
                                                    {item.instructions && (
                                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded bg-[#F4EBD0]/30 text-[9px] font-bold text-[#8B6508] border border-[#D4AF37]/10 uppercase tracking-wider">
                                                            Note: {item.instructions}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="flex items-center gap-4 bg-[#FCFBF7] rounded-full p-1 border border-[#F4EBD0]">
                                                        <button
                                                            onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-[#8B6508] hover:text-white hover:bg-[#D4AF37] active:scale-90 transition-all border border-[#F4EBD0]"
                                                        >
                                                            <Minus className="w-3 h-3" strokeWidth={3} />
                                                        </button>
                                                        <span className="text-sm font-black text-[#1A1A1A] w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-[#8B6508] hover:text-white hover:bg-[#D4AF37] active:scale-90 transition-all border border-[#F4EBD0]"
                                                        >
                                                            <Plus className="w-3 h-3" strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.cartId)}
                                                        className="text-[#8B6508]/40 hover:text-red-500 p-2 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="p-8 bg-white border-t border-[#D4AF37]/10 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[#8B6508]/60">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Service Mode</span>
                                        <span className="text-xs font-serif font-bold text-[#1A1A1A]">Banquet Service Included</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-y border-dashed border-[#D4AF37]/20">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Selection Summary</span>
                                        <span className="text-sm font-black text-[#1A1A1A]">{items.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCheckout}
                                    size="lg"
                                    className="w-full h-16 rounded-full text-[11px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-[#B8860B] to-[#D4AF37] hover:shadow-xl hover:shadow-[#D4AF37]/30 transition-all active:scale-[0.98] border-none text-white shadow-lg shadow-[#D4AF37]/20"
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
