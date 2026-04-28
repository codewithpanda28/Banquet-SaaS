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
    { id: 'confirmed', label: 'Order Received', description: 'Kitchen has received your order.', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'preparing', label: 'Preparing Food', description: 'Chefs are cooking your delicious meal.', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'ready', label: 'Ready to Serve', description: 'Your food is ready. Enjoy your meal!', icon: Utensils, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'completed', label: 'Order Finished', description: 'Your banquet experience is completed. Visit again!', icon: PartyPopper, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
]

export default function TrackOrderPage() {
    const params = useParams()
    const router = useRouter()
    const billId = params.billId as string
    const { order, items, loading, error } = useOrder(billId)
    const [expandDetail, setExpandDetail] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)

    // Sounds Helper
    const playStatusSound = (url: string) => {
        try {
            const audio = new Audio(url)
            audio.play().catch(() => {})
        } catch (e) {}
    }

    useEffect(() => {
        if (order?.status) {
            console.log('💎 [Customer Tracking] Status Match:', order.status)
            switch (order.status) {
                case 'confirmed': playStatusSound('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); break; 
                case 'preparing': playStatusSound('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); break;
                case 'ready': playStatusSound('https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3'); break; // Crisper Hotel Bell
                case 'served':
                case 'completed': playStatusSound('https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3'); setShowConfetti(true); break;
                case 'cancelled': playStatusSound('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'); break; // Error Buzz
            }
        }
    }, [order?.status])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FCFBF7] gap-8">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-[#D4AF37]/20 rounded-full animate-spin border-t-[#D4AF37]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                    </div>
                </div>
                <p className="text-[#8B6508]/40 font-black animate-pulse tracking-[0.3em] uppercase text-[10px]">Consulting Order Logs</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#FCFBF7] flex flex-col items-center justify-center p-8 text-center space-y-10">
                <div className="w-32 h-32 bg-white border border-[#D4AF37]/20 rounded-full flex items-center justify-center shadow-lg">
                    <Utensils className="w-16 h-16 text-[#D4AF37] opacity-20" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">Record Not Found</h1>
                    <p className="text-[#8B6508]/60 font-medium text-lg max-w-xs mx-auto">
                        {error || "We couldn't find the banquet record you are looking for."}
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full px-12 h-16 bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#D4AF37]/20 transition-all active:scale-95"
                >
                    Return to Selection
                </Button>
            </div>
        )
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-10">
                <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms] border border-red-100">
                    <span className="text-6xl">🥀</span>
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-serif font-bold text-red-900 tracking-tight">Order Revoked</h1>
                    <p className="text-red-700/60 font-medium text-lg italic">Regrettably, this order could not be fulfilled.</p>
                </div>
                <Button
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full px-12 h-16 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] transition-all"
                >
                    Back to Menu
                </Button>
            </div>
        )
    }

    let currentStepIndex = 0;
    if (order.status === 'preparing') currentStepIndex = 1;
    if (order.status === 'ready') currentStepIndex = 2;
    if (['served', 'completed'].includes(order.status)) currentStepIndex = 3;

    const activeStep = STATUS_STEPS[currentStepIndex]
    const isCompleted = ['served', 'completed'].includes(order.status)

    return (
        <div className="min-h-screen bg-[#FCFBF7] pb-36 relative font-sans">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[30rem] bg-gradient-to-b from-[#F4EBD0]/30 to-transparent -z-10" />

            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-[#D4AF37]/10 mb-8 sticky top-0 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full h-10 w-10 hover:bg-[#F4EBD0]/50 text-[#8B6508]"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1 text-center">
                    <span className="text-[10px] font-black tracking-[0.4em] text-[#D4AF37] uppercase">Live Status</span>
                </div>
                <div className="w-10 flex justify-end">
                    {order.table_id && (
                        <div className="w-10 h-10 rounded-full bg-[#F4EBD0] flex items-center justify-center border-2 border-[#D4AF37]/30 shadow-sm">
                            <span className="text-[10px] font-black text-[#8B6508]">T-{order.restaurant_tables?.table_number || '?'}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="px-8 space-y-12 max-w-lg mx-auto relative">
                {/* Official ID */}
                <div className="flex flex-col items-center text-center">
                    <div className="bg-white border border-[#D4AF37]/10 shadow-xl shadow-[#D4AF37]/5 rounded-[2rem] px-8 py-4 flex flex-col items-center animate-in slide-in-from-top-4 duration-700">
                        <span className="text-[9px] font-black tracking-[0.3em] text-[#D4AF37] uppercase mb-2">Banquet Order Record</span>
                        <span className="text-2xl font-mono font-black text-[#1A1A1A] tracking-[0.2em]">
                            #{billId.slice(-6).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Hero Status */}
                <div className="flex flex-col items-center text-center space-y-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="relative"
                    >
                        <div className={cn(
                            "w-40 h-40 rounded-full flex items-center justify-center bg-white shadow-2xl relative z-10 border border-[#D4AF37]/20",
                            "text-[#D4AF37]"
                        )}>
                            <activeStep.icon className="w-20 h-20" strokeWidth={1} />
                        </div>
                        
                        {!isCompleted && (
                            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 animate-ping duration-[4s]" />
                        )}

                        {!isCompleted && order.status !== 'ready' && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl whitespace-nowrap"
                            >
                                <Clock className="w-3 h-3 text-[#D4AF37]" />
                                <span>~{order.estimated_time || 20} mins</span>
                            </motion.div>
                        )}
                    </motion.div>

                    <div className="space-y-3">
                        <motion.h1
                            key={activeStep.label}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight"
                        >
                            {activeStep.label}
                        </motion.h1>
                        <motion.p
                            key={activeStep.description}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-[#8B6508]/60 font-medium italic text-lg leading-relaxed max-w-[280px]"
                        >
                            {activeStep.description}
                        </motion.p>
                    </div>
                </div>

                {/* Tracking Steps */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-[#D4AF37]/10 shadow-xl shadow-[#D4AF37]/5 space-y-10 relative overflow-hidden">
                    <div className="absolute left-14 top-16 bottom-16 w-0.5 bg-[#F4EBD0]" />
                    
                    {STATUS_STEPS.map((step, idx) => {
                        const isDone = idx < currentStepIndex
                        const isActive = idx === currentStepIndex
                        const Icon = step.icon

                        return (
                            <div key={step.id} className="flex gap-8 relative z-10">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-sm",
                                    isDone ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
                                    isActive ? "bg-[#D4AF37] border-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20 scale-110" :
                                    "bg-[#FCFBF7] border-[#F4EBD0] text-[#D4AF37]/30"
                                )}>
                                    {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 space-y-1 py-1">
                                    <h3 className={cn(
                                        "text-sm font-black uppercase tracking-widest",
                                        isActive ? "text-[#1A1A1A]" : "text-[#8B6508]/40"
                                    )}>
                                        {step.label}
                                    </h3>
                                    {isActive && (
                                        <p className="text-xs text-[#8B6508]/60 leading-relaxed font-medium">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Success Message for Completed Orders */}
                {order.status === 'completed' && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="p-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-[2.5rem] text-white text-center space-y-4 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                        <PartyPopper className="w-16 h-16 mx-auto mb-2 text-white/90" />
                        <h2 className="text-2xl font-black uppercase tracking-widest leading-none">Order Finished!</h2>
                        <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                            Your banquet experience has been successfully completed. We hope you enjoyed your meal!
                        </p>
                        <div className="pt-2">
                             <Button 
                                onClick={() => router.push('/customer/menu')}
                                className="w-full h-14 bg-white text-emerald-700 hover:bg-emerald-50 font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
                             >
                                Back to Selection
                             </Button>
                        </div>
                    </motion.div>
                )}

                {/* Items Summary */}
                <div className="space-y-6">
                    <button 
                        onClick={() => setExpandDetail(!expandDetail)}
                        className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] border border-[#D4AF37]/10 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#F4EBD0] rounded-xl flex items-center justify-center text-[#8B6508]">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Selection Detail</p>
                                <p className="text-sm font-bold text-[#1A1A1A]">{items.length} Offerings</p>
                            </div>
                        </div>
                        {expandDetail ? <ChevronUp className="w-5 h-5 text-[#D4AF37]" /> : <ChevronDown className="w-5 h-5 text-[#D4AF37]" />}
                    </button>

                    <AnimatePresence>
                        {expandDetail && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white/50 rounded-[2rem] border border-[#D4AF37]/5"
                            >
                                <div className="p-8 space-y-4">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 rounded-lg bg-white border border-[#F4EBD0] flex items-center justify-center text-[10px] font-black text-[#8B6508] shadow-sm">
                                                    {item.quantity}
                                                </span>
                                                <span className="font-medium text-[#1A1A1A]">{item.item_name}</span>
                                            </div>
                                            <span className="font-black text-[#D4AF37] text-xs">INCLUDED</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-md border-t border-[#D4AF37]/10 z-50">
                <div className="max-w-lg mx-auto">
                    <Button 
                        onClick={() => router.push('/customer/menu')}
                        size="lg"
                        className="w-full h-16 rounded-full text-[11px] font-black uppercase tracking-[0.3em] bg-[#1A1A1A] text-white hover:bg-black transition-all active:scale-[0.98] border-none shadow-2xl"
                    >
                        Explore More Delicacies
                    </Button>
                </div>
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
