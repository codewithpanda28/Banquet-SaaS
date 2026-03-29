'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, MessageSquare, Send, CheckCircle2, Loader2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function ReviewContent() {
    const searchParams = useSearchParams()
    const restaurantId = searchParams.get('id')
    
    const [restaurant, setRestaurant] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    
    // Form State
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')

    useEffect(() => {
        const fetchRestro = async () => {
            if (!restaurantId) return
            const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single()
            if (data) setRestaurant(data)
            setLoading(false)
        }
        fetchRestro()
    }, [restaurantId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }
        if (!restaurantId) return

        setSubmitting(true)
        try {
            const { error } = await supabase.from('customer_reviews').insert([{
                restaurant_id: restaurantId,
                customer_name: customerName || 'Guest',
                customer_phone: customerPhone,
                rating,
                feedback,
                created_at: new Date().toISOString()
            }])

            if (error) throw error
            
            setSubmitted(true)
            toast.success('Thank you for your feedback!')
        } catch (error) {
            console.error('Review Error:', error)
            toast.error('Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Preparing Feedback Terminal...</p>
        </div>
    )

    if (!restaurantId) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
            <Utensils className="w-12 h-12 text-gray-700 mb-4" />
            <h1 className="text-2xl font-black mb-2">Invalid Node</h1>
            <p className="text-gray-500 max-w-xs">Please scan a valid QR code from the restaurant counter.</p>
        </div>
    )

    if (submitted) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/20">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tighter">SUCCESS!</h1>
            <p className="text-gray-400 font-medium mb-8 max-w-xs">Your valuable feedback for <span className="text-white font-bold">{restaurant?.name}</span> has been analyzed.</p>
            <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="rounded-2xl border-white/10 hover:bg-white/5 bg-transparent text-white font-bold h-14 w-full max-w-xs"
            >
                Submit New Feedback
            </Button>
        </div>
    )

    return (
        <div className="min-h-screen bg-black pb-20 overflow-x-hidden">
            {/* Branding Header */}
            <div className="relative h-64 w-full overflow-hidden flex flex-col items-center justify-center text-center p-6 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
                {restaurant?.logo_url ? (
                    <img src={restaurant.logo_url} className="h-20 w-auto mb-6 object-contain drop-shadow-2xl brightness-110" alt="Logo" />
                ) : (
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10 font-black text-3xl">
                        {restaurant?.name?.[0]}
                    </div>
                )}
                <h1 className="text-2xl font-black tracking-tighter text-white uppercase">{restaurant?.name}</h1>
                <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-purple-500 mt-2">Quality Hub & Feedback</div>
            </div>

            <div className="max-w-md mx-auto p-6 -mt-10 relative z-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="bg-[#111111] border-white/5 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="text-center mb-8">
                            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 block mb-6">How was your experience?</label>
                            <div className="flex justify-between items-center px-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onMouseEnter={() => setHover(s)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(s)}
                                        className="transition-all duration-300 hover:scale-125 focus:outline-none group/star"
                                    >
                                        <Star 
                                            className={cn(
                                                "w-10 h-10 transition-all duration-500 drop-shadow-lg",
                                                (hover || rating) >= s 
                                                    ? "fill-yellow-400 text-yellow-500 scale-110" 
                                                    : "text-white/10 fill-transparent group-hover/star:text-white/20"
                                            )} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 text-[11px] font-black text-white/40 uppercase tracking-widest">
                                {rating === 5 && "Excellence! ⭐⭐⭐⭐⭐"}
                                {rating === 4 && "Great Experience! ⭐⭐⭐⭐"}
                                {rating === 3 && "Good Atmosphere ⭐⭐⭐"}
                                {rating === 2 && "Could Be Better ⭐⭐"}
                                {rating === 1 && "Poor Quality ⭐"}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Write your feedback</label>
                                <Textarea 
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tell us what you loved or what we can improve..."
                                    className="bg-black border-white/10 min-h-[140px] rounded-2xl p-5 text-white placeholder:text-gray-700 focus:border-purple-500/50 transition-all font-medium leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Your Name</label>
                                    <Input 
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Optional"
                                        className="bg-black border-white/10 h-14 rounded-2xl px-5 text-white font-bold focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Phone Number</label>
                                    <Input 
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="For exclusive offers"
                                        className="bg-black border-white/10 h-14 rounded-2xl px-5 text-white font-bold focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit"
                            disabled={submitting || rating === 0}
                            className="w-full h-16 rounded-[2rem] bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-purple-600/20 mt-8 group active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-white/10 disabled:text-gray-700"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Cast Feedback</span>
                                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </Card>
                </form>

                {/* Footer Insight */}
                <div className="mt-12 text-center">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 inline-flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Secure Feedback Node: #BR-0{restaurantId?.slice(-3)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ReviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            </div>
        }>
            <ReviewContent />
        </Suspense>
    )
}
