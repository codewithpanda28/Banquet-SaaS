'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, Clock, ChefHat, ShoppingBag, Phone, ArrowLeft, Loader2, Bell, Ban, Box } from 'lucide-react'
import { useOrder } from '@/hooks/useOrder'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import useSound from 'use-sound'
import { ORDER_STATUS_SOUND } from '@/constants/sounds'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const STATUS_STEPS = [
    { id: 'confirmed', label: 'Order Confirmed', description: 'Restaurant has received your order', icon: CheckCircle },
    { id: 'preparing', label: 'Preparing', description: 'Your food is being cooked with love', icon: ChefHat },
    { id: 'ready', label: 'Ready for Service', description: 'Almost there! Plating up now', icon: Loader2 },
    { id: 'served', label: 'Served', description: 'Enjoy your meal!', icon: ShoppingBag },
]

export default function TrackOrderPage() {
    const params = useParams()
    const router = useRouter()
    const billId = params.billId as string
    const { order, items, loading } = useOrder(billId)
    const [expandDetail, setExpandDetail] = useState(false)
    const [arMode, setArMode] = useState(false)

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
                case 'served': playServed(); break;
                case 'cancelled': playCancelled(); break;
            }
            if (order.status !== 'pending') {
                toast.dismiss()
                toast(`Order Status Updated: ${order.status.toUpperCase()}`, {
                    icon: <Bell className="w-4 h-4 text-primary" />
                })
            }
        }
    }, [order?.status, playConfirmed, playPreparing, playReady, playServed, playCancelled])

    if (loading || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Tracking Order #{billId}</p>
            </div>
        )
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <Ban className="w-12 h-12 text-red-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-red-900">Order Cancelled</h1>
                    <p className="text-red-700 mt-2">We're sorry, this order has been cancelled.</p>
                    <p className="text-sm text-red-600/80 mt-1">Order #{billId}</p>
                </div>
                <Button onClick={() => router.push('/customer/menu')} variant="destructive" className="rounded-full px-8">
                    Browse Menu
                </Button>
            </div>
        )
    }

    const currentStepIndex = STATUS_STEPS.findIndex(step =>
        order.status === step.id ||
        (order.status === 'completed' && step.id === 'served') ||
        (order.status === 'served' && step.id === 'ready')
    )

    const isCompleted = order.status === 'completed' || order.status === 'served'

    const getStepStatus = (index: number) => {
        if (order.status === STATUS_STEPS[index].id) return 'current'
        if (currentStepIndex > index || isCompleted) return 'completed'
        return 'pending'
    }

    const activeStep = STATUS_STEPS[currentStepIndex] || STATUS_STEPS[0]

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Sticky Header with Status */}
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm transition-all duration-300">
                <div className="py-2 px-4 flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/customer/menu')} className="rounded-full hover:bg-muted -ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Order Status</span>
                        <span className="text-sm font-black font-mono tracking-wider">#{billId}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full relative">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        </Button>
                        {order.table_id && (
                            <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs border border-primary/20">
                                T-{order.restaurant_tables?.table_number}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hero Status Card */}
                <div className="px-6 pb-6 pt-2 text-center">
                    <motion.div
                        key={activeStep.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-500",
                            activeStep.id === 'preparing' ? "bg-orange-100 text-orange-600 animate-pulse" : "bg-green-100 text-green-600"
                        )}>
                            <activeStep.icon className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-800">
                                {activeStep.label}
                            </h2>
                            <p className="text-muted-foreground text-sm font-medium">{activeStep.description}</p>
                        </div>

                        {/* Estimated Timer */}
                        {!isCompleted && (
                            <div className="mt-2 bg-black/5 rounded-full px-4 py-1.5 flex items-center gap-2 font-mono text-sm font-bold text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                ~{order.estimated_time || 25} mins left
                            </div>
                        )}
                    </motion.div>
                </div>
            </header>

            {/* AR View Toggle */}
            <div className="px-6 mt-4">
                <button
                    onClick={() => setArMode(!arMode)}
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-1 rounded-2xl shadow-lg relative overflow-hidden group"
                >
                    <div className="bg-background/10 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Box className="w-8 h-8 text-white fill-white/20" />
                            <div className="text-left">
                                <p className="font-bold text-sm">3D Food Preview</p>
                                <p className="text-[10px] text-white/80">Visualize your order in AR</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">BETA</Badge>
                    </div>
                </button>

                <AnimatePresence>
                    {arMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 300, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 bg-black rounded-2xl overflow-hidden relative shadow-2xl border-2 border-purple-500/50"
                        >
                            {/* Mock AR View */}
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                <div className="grid grid-cols-8 gap-1 absolute inset-0 opacity-20 pointer-events-none">
                                    {Array.from({ length: 64 }).map((_, i) => (
                                        <div key={i} className="border-[0.5px] border-green-500/30" />
                                    ))}
                                </div>
                                <div className="relative z-10 text-center space-y-4">
                                    <div className="w-32 h-32 border-2 border-white/50 rounded-lg flex items-center justify-center mx-auto animate-pulse">
                                        <Box className="w-16 h-16 text-white/50" />
                                    </div>
                                    <p className="text-white font-mono text-sm animate-pulse">Scanning Surface...</p>
                                    <div className="flex justify-center gap-2">
                                        <Badge variant="outline" className="text-white border-white/30">Rotate</Badge>
                                        <Badge variant="outline" className="text-white border-white/30">Scale</Badge>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setArMode(false)}
                                    className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            <div className="p-6 max-w-lg mx-auto space-y-6 relative z-10">
                {/* Vertical Timeline */}
                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-transparent">
                    {STATUS_STEPS.map((step, index) => {
                        const status = getStepStatus(index)
                        const isActive = status === 'current'
                        const isDone = status === 'completed'

                        return (
                            <div key={step.id} className="relative group">
                                <div className={cn(
                                    "absolute -left-[29px] top-1 w-6 h-6 rounded-full border-4 transition-all duration-500 z-10 flex items-center justify-center bg-white shadow-sm",
                                    isDone || isActive ? "border-primary scale-110" : "border-muted scale-90"
                                )}>
                                    {(isDone || isActive) && <div className="w-2 h-2 bg-primary rounded-full animate-ping opacity-20 absolute" />}
                                    {(isDone || isActive) && <div className="w-2 h-2 bg-primary rounded-full relative" />}
                                </div>

                                <div className={cn(
                                    "transition-all duration-500 pl-2",
                                    isDone || isActive ? "opacity-100 translate-x-0" : "opacity-40 translate-x-[-4px]"
                                )}>
                                    <h3 className={cn("font-bold text-base leading-none", isActive ? "text-primary scale-105 origin-left" : "text-foreground")}>
                                        {step.label}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 font-medium">{step.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Order Details Card */}
                <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border overflow-hidden mt-8 transition-all">
                    <button
                        onClick={() => setExpandDetail(!expandDetail)}
                        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm border">
                                <ShoppingBag className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Order Summary</p>
                                <p className="text-xs text-muted-foreground">{items.length} items • ₹{order.total.toFixed(2)}</p>
                            </div>
                        </div>
                        <motion.div animate={{ rotate: expandDetail ? 180 : 0 }}>
                            <ArrowLeft className="w-4 h-4 -rotate-90 text-muted-foreground" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {(expandDetail || !isCompleted) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 space-y-4 border-t border-dashed bg-white">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-start text-sm group">
                                            <div className="flex gap-3">
                                                <span className="font-mono font-bold text-muted-foreground bg-secondary px-1.5 rounded h-5 text-xs flex items-center justify-center min-w-[24px]">
                                                    {item.quantity}x
                                                </span>
                                                <div>
                                                    <p className="font-bold text-foreground/90">{item.item_name}</p>
                                                    {item.special_instructions && (
                                                        <p className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                                                            Note: {item.special_instructions}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-medium text-foreground/80">₹{(item.total).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-3 mt-2 flex justify-between font-black text-lg text-primary items-baseline bg-primary/5 -mx-4 -mb-4 px-4 py-3">
                                        <span className="text-sm font-bold text-primary/70 uppercase tracking-widest">Total Paid</span>
                                        <span>₹{order.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Floating Actions */}
            <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3">
                <Button
                    className="flex-1 h-14 rounded-2xl shadow-xl shadow-primary/25 bg-gradient-to-r from-primary to-orange-600 text-base font-bold active:scale-[0.98] transition-transform"
                    onClick={() => router.push('/customer/menu')}
                >
                    Order More Items
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-2xl border-2 border-primary/20 bg-white shadow-lg active:bg-secondary transition-colors"
                >
                    <Phone className="w-6 h-6 text-primary" />
                </Button>
            </div>
        </div>
    )
}
