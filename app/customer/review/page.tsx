'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, Send, CheckCircle2, Loader2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function ReviewContent() {
    const searchParams = useSearchParams()
    const restaurantId = searchParams.get('id')
    const billId = searchParams.get('billId') || searchParams.get('orderId')
    const urlName = searchParams.get('name') || ''
    const urlPhone = searchParams.get('phone') || ''
    const urlItems = searchParams.get('items') || ''
    
    const [restaurant, setRestaurant] = useState<any>(null)
    const [dbItems, setDbItems] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [copied, setCopied] = useState(false)
    
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [feedback, setFeedback] = useState('')

    useEffect(() => {
        const fetchRestro = async () => {
            if (!restaurantId) return
            const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single()
            if (data) setRestaurant(data)
            
            // 🥗 FETCH ACTUAL FOOD ITEMS FROM DB
            if (billId) {
                const { data: orderItems } = await supabase
                    .from('order_items')
                    .select('name')
                    .eq('order_id', billId)
                
                if (orderItems && orderItems.length > 0) {
                    const itemsList = orderItems.map((i: any) => i.name).join(', ')
                    setDbItems(itemsList)
                }
            }
            setLoading(false)
        }
        fetchRestro()
    }, [restaurantId, billId])

    useEffect(() => {
        if (rating >= 4 && feedback === '') {
            const finalItems = dbItems || urlItems
            const itemText = finalItems ? `The ${finalItems}` : 'The food'
            setFeedback(`${itemText} at ${restaurant?.name || 'this restaurant'} was absolutely delicious! High quality and exceptional service. 10/10 experience! ⭐⭐⭐⭐⭐`)
        }
        
        if (rating > 0 && rating < 4) {
            handleQuickSubmit(rating)
        }
    }, [rating, restaurant?.name, dbItems, urlItems])

    const handleCopy = () => {
        navigator.clipboard.writeText(feedback)
        setCopied(true)
        toast.success('Review copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleGoogleRedirect = () => {
        const url = restaurant?.google_review_url || 'https://g.page/review'
        window.open(url, '_blank')
    }

    const handleQuickSubmit = async (val: number) => {
        if (!restaurantId || submitting) return
        setSubmitting(true)
        try {
            await supabase.from('customer_reviews').insert([{
                restaurant_id: restaurantId,
                customer_name: urlName || 'Guest',
                customer_phone: urlPhone,
                rating: val,
                feedback: 'Negative/Neutral Rating (Quick)',
                created_at: new Date().toISOString()
            }])
            setSubmitted(true)
        } catch (e) {
            console.error(e)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) return
        if (!restaurantId) return

        setSubmitting(true)
        try {
            await supabase.from('customer_reviews').insert([{
                restaurant_id: restaurantId,
                customer_name: urlName || 'Guest',
                customer_phone: urlPhone,
                rating,
                feedback,
                created_at: new Date().toISOString()
            }])
            
            handleGoogleRedirect()
            setSubmitted(true)
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-4 font-sans">
            <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Preparing...</p>
        </div>
    )

    if (submitted) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-700 font-sans">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-slate-800" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tighter text-slate-900 italic uppercase">Redirected!</h1>
            <p className="text-slate-500 font-medium mb-8 max-w-xs leading-relaxed text-sm">If the Google page didn't open, please check your blocker. Thank you for supporting <span className="text-slate-900 font-bold">{restaurant?.name}</span>!</p>
            <Button onClick={() => setSubmitted(false)} variant="link" className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Back to Start</Button>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans leading-none">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <Card className="bg-white border-none rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] p-12">
                        <div className="text-center mb-12">
                            <label className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 block mb-12">Star Rating</label>
                            <div className="flex justify-between items-center px-4">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onMouseEnter={() => setHover(s)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(s)}
                                        className="transition-all duration-300 hover:scale-125 focus:outline-none"
                                    >
                                        <Star 
                                            className={cn(
                                                "w-12 h-12 transition-all duration-300",
                                                (hover || rating) >= s 
                                                    ? "fill-yellow-400 text-yellow-500 drop-shadow-xl" 
                                                    : "text-slate-100 fill-slate-50 hover:text-slate-200"
                                            )} 
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {rating >= 4 && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
                                <div className="h-px bg-slate-100 w-full" />
                                
                                <div className="relative group/feedback">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-4 block ml-1">Copy Your Review</label>
                                    <Textarea 
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="bg-slate-50 border-none min-h-[160px] rounded-[2.5rem] p-8 text-slate-900 focus:ring-0 transition-all font-medium leading-relaxed resize-none text-base pr-16 shadow-inner italic"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleCopy}
                                        className={cn(
                                            "absolute top-14 right-6 p-4 rounded-2xl shadow-xl transition-all active:scale-90",
                                            copied ? "bg-green-500 text-white" : "bg-white text-slate-900 border border-slate-100 shadow-md"
                                        )}
                                    >
                                        {copied ? <CheckCircle2 className="w-5 h-5" /> : <Utensils className="w-5 h-5 text-slate-400" />}
                                    </button>
                                    <p className="text-[10px] font-bold text-slate-300 mt-4 text-center uppercase tracking-[0.2em]">👆 Tap Box to Copy</p>
                                </div>

                                <Button 
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-20 rounded-[2.5rem] bg-slate-900 hover:bg-black text-white font-black text-[15px] uppercase tracking-[0.4em] shadow-3xl transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Next</span>
                                            <Send className="w-5 h-5 mb-0.5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                        
                        {(rating > 0 && rating < 4) && (
                            <div className="flex flex-col items-center justify-center py-16 animate-pulse transition-all">
                                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mb-4" />
                                <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Feedback Saved</p>
                                <p className="text-[10px] font-bold text-slate-300 mt-1 italic">Thank you for visiting!</p>
                            </div>
                        )}
                    </Card>
                </form>
            </div>
        </div>
    )
}

export default function ReviewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewContent />
        </Suspense>
    )
}
