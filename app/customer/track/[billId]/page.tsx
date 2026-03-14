'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, ShoppingBag, ArrowLeft, Loader2, PartyPopper, Utensils, ChevronDown, ChevronUp } from 'lucide-react'
import { useOrder } from '@/hooks/useOrder'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import useSound from 'use-sound'
import { ORDER_STATUS_SOUND } from '@/constants/sounds'
import { supabase } from '@/lib/supabase'

const STATUS_STEPS = [
    { id: 'confirmed', label: 'Order Confirmed', description: 'We\'ve received your order!', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'preparing', label: 'Cooking with Love', description: 'Chefs are working their magic.', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'ready', label: 'Ready to Serve', description: 'Plating up your delicious meal.', icon: Utensils, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'served', label: 'Bon Appétit!', description: 'Enjoy your meal.', icon: PartyPopper, color: 'text-green-500', bg: 'bg-green-500/10' },
]

export default function TrackOrderPage() {
    const params = useParams()
    const router = useRouter()
    const billId = params.billId as string
    const { order, items, loading } = useOrder(billId)
    const [expandDetail, setExpandDetail] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)

    // Sounds
    const [playConfirmed] = useSound(ORDER_STATUS_SOUND.confirmed)
    const [playPreparing] = useSound(ORDER_STATUS_SOUND.preparing)
    const [playReady] = useSound(ORDER_STATUS_SOUND.ready)
    const [playServed] = useSound(ORDER_STATUS_SOUND.served)
    const [playCancelled] = useSound(ORDER_STATUS_SOUND.cancelled)

    useEffect(() => {
        if (order?.status) {
            switch (order.status) {
                case 'confirmed': playConfirmed(); break;
                case 'preparing': playPreparing(); break;
                case 'ready': playReady(); break;
                case 'served': playServed(); setShowConfetti(true); break;
                case 'cancelled': playCancelled(); break;
            }
        }
    }, [order?.status, playConfirmed, playPreparing, playReady, playServed, playCancelled])

    if (loading || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                </div>
                <p className="text-slate-400 font-medium animate-pulse tracking-wide uppercase text-xs">Loading Order...</p>
            </div>
        )
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center space-y-8">
                <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center animate-bounce duration-1000">
                    <div className="w-24 h-24 bg-red-200 rounded-full flex items-center justify-center">
                        <span className="text-6xl">💔</span>
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-red-900 tracking-tight">Order Cancelled</h1>
                    <p className="text-red-700/80 mt-3 font-medium text-lg">We couldn't fulfill your order this time.</p>
                </div>
                <Button
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full px-10 h-14 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 transition-transform active:scale-95"
                >
                    Return to Menu
                </Button>
            </div>
        )
    }

    const currentStepIndex = STATUS_STEPS.findIndex(step =>
        order.status === step.id ||
        (order.status === 'completed' && step.id === 'served') ||
        (order.status === 'served' && step.id === 'ready')
    )

    const activeStep = STATUS_STEPS[currentStepIndex] || STATUS_STEPS[0]
    const isCompleted = order.status === 'completed' || order.status === 'served'

    return (
        <div className="min-h-screen bg-slate-50/50 pb-36 relative overflow-hidden font-sans">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-50 to-transparent -z-10" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl -z-10" />
            <div className="absolute top-48 -left-24 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl -z-10" />

            {/* Header */}
            <header className="px-4 py-4 sticky top-0 z-40 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full hover:bg-black/5 hover:text-black transition-colors text-slate-600"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Order ID</span>
                    <span className="text-sm font-bold text-slate-900 font-mono tracking-wide">#{billId.slice(-6)}</span>
                </div>
                <div className="w-10 flex justify-center">
                    {order.table_id && (
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200">
                            <span className="text-[10px] font-black text-orange-700">T-{order.restaurant_tables?.table_number || '?'}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="px-6 pt-8 space-y-10 max-w-lg mx-auto">
                {/* Hero Status */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="relative"
                    >
                        <div className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center bg-white shadow-2xl relative z-10",
                            activeStep.color
                        )}>
                            <activeStep.icon className="w-16 h-16" strokeWidth={1.5} />
                        </div>
                        {/* Ripple Effect */}
                        {!isCompleted && (
                            <>
                                <div className={cn("absolute inset-0 rounded-full opacity-20 animate-ping duration-[3s]", activeStep.bg.replace('/10', ''))} />
                                <div className={cn("absolute -inset-4 rounded-full opacity-10 animate-pulse", activeStep.bg.replace('/10', ''))} />
                            </>
                        )}

                        {/* Timer Badge */}
                        {!isCompleted && order.status !== 'ready' && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap"
                            >
                                <Clock className="w-3 h-3 text-orange-400" />
                                <span>~{order.estimated_time || 20} mins</span>
                            </motion.div>
                        )}
                    </motion.div>

                    <div className="space-y-2">
                        <motion.h1
                            key={activeStep.label}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-3xl font-black text-slate-900 tracking-tight"
                        >
                            {activeStep.label}
                        </motion.h1>
                        <motion.p
                            key={activeStep.description}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-slate-500 font-medium text-lg"
                        >
                            {activeStep.description}
                        </motion.p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="relative py-4">
                    <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-200/70 rounded-full" />
                    <div className="space-y-8 relative">
                        {STATUS_STEPS.map((step, index) => {
                            const isCurrent = index === currentStepIndex
                            const isPast = index < currentStepIndex || isCompleted
                            const isFuture = index > currentStepIndex && !isCompleted

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-6 relative"
                                >
                                    {/* Icon Bubble */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center border-4 relative z-10 transition-all duration-500 shrink-0",
                                        isCurrent ? "bg-orange-500 border-orange-500 shadow-xl scale-110" :
                                            isPast ? "bg-orange-500 border-orange-500 shadow-md" :
                                                "bg-slate-100 border-slate-100"
                                    )}>
                                        {isPast ? (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        ) : (
                                            <step.icon className={cn(
                                                "w-6 h-6 transition-colors",
                                                isCurrent ? "text-white" : "text-slate-400"
                                            )} />
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className={cn(
                                        "flex-1 p-4 rounded-xl transition-all duration-300",
                                        isCurrent ? "" : "opacity-60 grayscale-[0.5]"
                                    )}>
                                        <h3 className={cn(
                                            "font-bold text-sm text-slate-600"
                                        )}>
                                            {step.label}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Order Summary Receipt */}
                <motion.div
                    layout
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100"
                >
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <ShoppingBag className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Your Order</p>
                                <p className="text-xs text-slate-400">{items.length} Items</p>
                            </div>
                        </div>
                        <p className="font-mono font-bold text-lg text-orange-400">₹{order.total.toFixed(2)}</p>
                    </div>

                    <div className="p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        <div className="space-y-4">
                            {/* Summary Preview (First 2 items) */}
                            {!expandDetail && items.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md">{item.quantity}x</span>
                                        <span className="font-medium text-slate-700">{item.item_name}</span>
                                    </div>
                                    <span className="font-mono text-slate-500">₹{Number(item.total).toFixed(2)}</span>
                                </div>
                            ))}

                            <AnimatePresence>
                                {expandDetail && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 pt-1"
                                    >
                                        {/* Full List */}
                                        {items.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md min-w-[32px] text-center">{item.quantity}x</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-700">{item.item_name}</span>
                                                        {item.special_instructions && (
                                                            <span className="text-[10px] text-orange-600 font-medium italic">Note: {item.special_instructions}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="font-mono text-slate-500">₹{Number(item.total).toFixed(2)}</span>
                                            </div>
                                        ))}

                                        <div className="border-t border-dashed border-slate-200 my-4" />

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-mono font-bold">₹{order.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Tax</span>
                                            <span className="font-mono font-bold">₹{order.tax?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            onClick={() => setExpandDetail(!expandDetail)}
                        >
                            {expandDetail ? <span className="flex items-center gap-2">Show Less <ChevronUp className="w-3 h-3" /></span> : <span className="flex items-center gap-2">View Full Receipt <ChevronDown className="w-3 h-3" /></span>}
                        </Button>
                    </div>
                </motion.div>
            </main>

            {/* Floating Action Bar */}
            <div className="fixed bottom-6 left-6 right-6 z-40 bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl shadow-orange-900/10 border border-white/50 flex items-center justify-center gap-2">
                <Button
                    className="flex-1 h-12 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white font-bold shadow-lg transition-all active:scale-95"
                    onClick={() => router.push('/customer/menu')}
                >
                    Order More
                </Button>
            </div>

            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-20">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce flex items-center gap-2">
                        <PartyPopper className="w-5 h-5" /> Order Complete!
                    </div>
                </div>
            )}
        </div>
    )
}
