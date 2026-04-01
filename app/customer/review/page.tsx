'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, Send, Copy, CheckCircle2, Navigation } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function ReviewContent() {
    const searchParams = useSearchParams()
    const restaurantId = searchParams.get('id')
    const billId = searchParams.get('billId')
    const urlName = searchParams.get('name') || ''
    const urlPhone = searchParams.get('phone') || ''
    const urlReview = searchParams.get('review') || ''

    const [restaurant, setRestaurant] = useState<any>(null)
    const [dbItems, setDbItems] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [copied, setCopied] = useState(false)
    
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [customerName, setCustomerName] = useState(urlName)
    const [customerPhone, setCustomerPhone] = useState(urlPhone)

    useEffect(() => {
        const fetchRestro = async () => {
            if (!restaurantId) return
            const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single()
            if (data) setRestaurant(data)
            
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
            if (urlReview) {
                setFeedback(urlReview)
            } else {
                const finalItems = dbItems || searchParams.get('items') || ''
                const itemText = finalItems ? `The ${finalItems}` : 'The food'
                setFeedback(`${itemText} at ${restaurant?.name || 'this restaurant'} were absolutely phenomenal! Every bite was a testament to the quality and passion put into the food. The ambiance was lovely, and the service was beyond exceptional. 10/10 recommendation! ⭐⭐⭐⭐⭐`)
            }
        }
        
        if (rating > 0 && rating < 4) {
            handleQuickSubmit(rating)
        }
    }, [rating, restaurant, dbItems, urlReview])

    const handleCopy = () => {
        navigator.clipboard.writeText(feedback)
        setCopied(true)
        toast.success('Review copied to clipboard!')
    }

    const handleQuickSubmit = async (lowRating: number) => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('customer_reviews').insert({
                restaurant_id: restaurantId,
                rating: lowRating,
                feedback: 'Low rating given by customer',
                customer_name: customerName || 'Guest',
                customer_phone: customerPhone || ''
            })
            if (error) {
                console.error('Quick submit error:', error)
                toast.error('Could not save feedback, please try again.')
                return
            }
            setSubmitted(true)
        } catch (error) {
            console.error('Submission error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async () => {
        if (!rating) { toast.error('Please select a star rating!'); return }
        setSubmitting(true)
        try {
            const { error } = await supabase.from('customer_reviews').insert({
                restaurant_id: restaurantId,
                rating: rating,
                feedback: feedback,
                customer_name: customerName || 'Guest',
                customer_phone: customerPhone || ''
            })

            if (error) {
                console.error('Submit error:', error)
                toast.error('Could not save feedback. Please try again.')
                return
            }

            // 🔥 REDIRECT TO GOOGLE REVIEW LINK FROM SETTINGS
            const googleUrl = restaurant?.google_review_url || 'https://g.page/review'
            window.open(googleUrl, '_blank')
            setSubmitted(true)
        } catch (error) {
            console.error('Submission error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Terminal...</p>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white font-sans p-8 text-center animate-in zoom-in duration-500">
                <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter mb-4">THANK YOU!</h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Your feedback helps us grow. We hope to see you again soon at <span className="text-indigo-600 font-bold italic">{restaurant?.name}</span>.</p>
                <div className="mt-12">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Live Support Logged</p>
                    <div className="h-1 w-12 bg-slate-100 mx-auto rounded-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.1)] border border-indigo-50/50 p-8 md:p-12 overflow-hidden relative">
                    
                    {/* Header */}
                    <div className="text-center space-y-2 mb-12">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full mb-4">
                            <Star className="h-3 w-3 text-indigo-600 fill-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Share Your Experience</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                            How was your {billId ? 'meal' : 'visit'}?
                        </h1>
                        <p className="text-slate-400 font-medium text-sm">at {restaurant?.name}</p>
                    </div>

                    {/* Star Rating - EXTRA LARGE & PREMIUM */}
                    <div className="flex justify-center gap-2 md:gap-4 mb-16">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                className="relative group transition-all duration-300 transform active:scale-90"
                            >
                                <Star
                                    size={48}
                                    className={cn(
                                        "transition-all duration-300",
                                        (hover || rating) >= star 
                                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110" 
                                            : "text-slate-300 fill-slate-100/50"
                                    )}
                                />
                                <div className={cn(
                                    "absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 transition-all duration-500",
                                    rating === star ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                )} />
                            </button>
                        ))}
                    </div>

                    {/* High Rating Content (4-5 stars) */}
                    {rating >= 4 && (
                        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Full Name</p>
                                    <Input
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Guest Name"
                                        className="h-12 rounded-2xl border-slate-100 bg-white font-bold text-sm shadow-sm px-6 text-center md:text-left focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Contact</p>
                                    <Input
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Phone Number"
                                        className="h-12 rounded-2xl border-slate-100 bg-white font-bold text-sm shadow-sm px-6 text-center md:text-left focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 transition-all transform active:scale-[0.98] group"
                            >
                                {submitting ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Post on Google <Navigation className="ml-3 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Footer decoration */}
                    <div className="mt-12 text-center">
                        <div className="inline-block h-1 w-12 bg-indigo-100 rounded-full" />
                    </div>
                </div>
                
                <p className="text-center mt-8 text-slate-400 text-[10px] uppercase font-black tracking-widest leading-none">
                    Powered by {restaurant?.name || 'Restaurant Official'}
                </p>
            </div>
        </div>
    )
}

export default function ReviewPage() {
    return (
        <Suspense fallback={null}>
            <ReviewContent />
        </Suspense>
    )
}
