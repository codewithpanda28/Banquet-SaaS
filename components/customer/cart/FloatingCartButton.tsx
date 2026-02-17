'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'

export function FloatingCartButton() {
    const { items, getTotal, getItemCount } = useCartStore()
    const { openCart, isCartOpen } = useUIStore()
    const [isClient, setIsClient] = React.useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) return null

    // Hide on checkout and scan pages
    // Hide on checkout and scan pages
    if (pathname?.includes('checkout') || pathname?.includes('scan')) return null

    const count = getItemCount()
    const total = getTotal()

    if (count === 0) return null

    return (
        <AnimatePresence>
            {!isCartOpen && (
                <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-6 left-6 right-6 z-40 pointer-events-none"
                >
                    <button
                        onClick={openCart}
                        className="w-full bg-foreground text-background shadow-2xl shadow-black/20 rounded-2xl p-4 flex items-center justify-between pointer-events-auto hover:bg-foreground/90 active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-center gap-4 z-10">
                            <div className="bg-background/20 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
                                <ShoppingBag className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                    {count} {count === 1 ? 'Item' : 'Items'}
                                </span>
                                <span className="font-bold text-xl leading-none">
                                    ₹{total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 font-bold text-sm bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md group-hover:bg-white/20 transition-colors z-10">
                            View Cart <ChevronRight className="h-4 w-4" />
                        </div>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
