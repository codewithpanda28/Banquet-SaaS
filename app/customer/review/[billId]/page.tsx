'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, MessageSquare, Send, Heart, Utensils, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
// @ts-ignore
import Confetti from 'react-confetti'

export default function CustomerReviewPage() {
    const params = useParams()
    const router = useRouter()
    const billId = params.billId as string

    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<any>(null)
    const [restaurant, setRestaurant] = useState<any>(null)
    
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        fetchOrderDetails()
    }, [billId])

    async function fetchOrderDetails() {
        try {
            setLoading(true)
            const { data: orderData, error: orderErr } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers (name, phone),
                    restaurants (id, name, google_review_link, review_threshold)
                `)
                .eq('bill_id', billId)
                .single()

            if (orderErr) throw orderErr
            setOrder(orderData)
            setRestaurant(orderData.restaurants)
        } catch (err) {
            console.error('Error fetching order:', err)
            toast.error('Could not find your order details')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit() {
        if (!rating) {
            toast.error('Please select a rating')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/reviews/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: order.restaurant_id,
                    customer_name: order.customers?.name || order.customer_name || 'Valued Guest',
                    customer_phone: order.customers?.phone || 'N/A',
                    rating,
                    feedback
                })
            })

            const result = await response.json()
            if (result.success) {
                setSubmitted(true)
                if (rating >= (restaurant?.review_threshold || 4)) {
                    setShowConfetti(true)
                }
            } else {
                throw new Error(result.error)
            }
        } catch (err: any) {
            toast.error('Failed to submit feedback: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading...</p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <Utensils className="w-12 h-12 text-slate-300" />
                </div>
                <h1 className="text-2xl font-black text-slate-900">Order Not Found</h1>
                <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">Go Back Home</Button>
            </div>
        )
    }

    const isGoodRating = rating >= (restaurant?.review_threshold || 4)

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}
            
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-6 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Button>
                <div>
                    <h2 className="text-sm font-black text-slate-900 leading-none">{restaurant?.name || 'Restaurant'} Feedback</h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Bill ID: {billId}</p>
                </div>
            </header>

            <main className="max-w-md mx-auto px-6 pt-8 space-y-6">
                {!submitted ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">How was your meal?</h1>
                            <p className="text-slate-500 font-medium">Your feedback helps us serve you better!</p>
                        </div>

                        {/* Star Rating Grid */}
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(s)}
                                    className="relative transition-transform active:scale-90"
                                >
                                    <Star 
                                        className={cn(
                                            "w-12 h-12 transition-all duration-300",
                                            s <= (hoverRating || rating) 
                                                ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" 
                                                : "text-slate-200 fill-slate-100"
                                        )} 
                                        strokeWidth={1.5}
                                    />
                                    {s === rating && (
                                        <motion.div 
                                            layoutId="selected-star"
                                            className="absolute -inset-1 rounded-full border-2 border-amber-400/20"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Feedback Input */}
                        <AnimatePresence>
                            {(rating > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-slate-400 px-1">
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Share more details (Optional)</span>
                                        </div>
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder={rating >= 4 ? "What did you love most?" : "What can we improve next time?"}
                                            className="w-full min-h-[120px] rounded-3xl border-slate-200 bg-white p-6 text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all shadow-sm outline-none resize-none"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className={cn(
                                            "w-full h-14 rounded-full font-black text-lg shadow-xl transition-all active:scale-95 group",
                                            isGoodRating ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-900 hover:bg-black text-white"
                                        )}
                                    >
                                        <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        {submitting ? 'Submitting...' : 'Send Feedback'}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8 pt-8"
                    >
                        <div className="relative inline-block">
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto border-4 border-slate-50 relative z-10">
                                {isGoodRating ? (
                                    <Heart className="w-16 h-16 text-red-500 fill-red-500 animate-pulse" />
                                ) : (
                                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-amber-400/10 rounded-full animate-ping" />
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {isGoodRating ? 'You made our day!' : 'Thank you for your honesty!'}
                            </h2>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                {isGoodRating 
                                    ? "We're so glad you enjoyed your experience. It would mean the world to us if you could share this on Google too!"
                                    : "We value your feedback and have shared it with our kitchen team to make sure your next visit is perfect."}
                            </p>
                        </div>

                        {isGoodRating && restaurant?.google_review_link && (
                            <Button
                                onClick={() => window.open(restaurant.google_review_link, '_blank')}
                                className="w-full h-16 rounded-full bg-slate-900 hover:bg-black text-white font-black text-lg shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <img 
                                    src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
                                    className="w-6 h-6 bg-white p-1 rounded-full" 
                                    alt="Google"
                                />
                                Review us on Google
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            onClick={() => router.push('/')}
                            className="text-slate-400 font-bold hover:bg-slate-100 rounded-full px-8"
                        >
                            Return Home
                        </Button>
                    </motion.div>
                )}
            </main>

            {/* Footer Brand */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-white/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-100 flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Powered by</span>
                    <span className="text-[10px] font-black text-slate-900 tracking-tight">TastyBytes</span>
                </div>
            </div>
        </div>
    )
}
