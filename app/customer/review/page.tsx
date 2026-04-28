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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FCFBF7] font-sans">
                <div className="h-14 w-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] animate-pulse">Consulting Registry...</p>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white font-sans p-10 text-center animate-in zoom-in duration-700">
                <div className="h-24 w-24 bg-[#F4EBD0]/50 border border-[#D4AF37]/20 rounded-full flex items-center justify-center mb-10 shadow-sm">
                    <CheckCircle2 className="h-12 w-12 text-[#D4AF37]" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight mb-6 uppercase">Our Gratitude</h1>
                <p className="text-[#8B6508]/60 font-medium max-w-md mx-auto leading-relaxed text-lg italic">
                    Your gracious feedback has been recorded. It was an honor to host you at 
                    <span className="text-[#8B6508] font-bold block mt-2 not-italic">{restaurant?.name}</span>.
                </p>
                <div className="mt-16">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-3">Live Log Verified</p>
                    <div className="h-0.5 w-16 bg-[#F4EBD0] mx-auto rounded-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FCFBF7] font-sans flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#F4EBD0]/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#F4EBD0]/20 rounded-full blur-3xl" />

            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-[#D4AF37]/5 border border-[#D4AF37]/10 p-10 md:p-16 overflow-hidden text-center">
                    
                    {/* Header */}
                    <div className="space-y-6 mb-16">
                        <div className="inline-flex items-center gap-3 bg-[#F4EBD0]/30 px-5 py-2 rounded-full mb-2 border border-[#D4AF37]/10">
                            <Star className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37]" />
                            <span className="text-[10px] font-black text-[#8B6508] uppercase tracking-[0.3em]">Guest Impressions</span>
                        </div>
                        <h1 className="text-5xl font-serif font-bold text-[#1A1A1A] tracking-tight leading-[1.1]">
                            How was your <br/>
                            <span className="text-[#D4AF37] italic">{billId ? 'banquet' : 'experience'}?</span>
                        </h1>
                        <p className="text-[#8B6508]/40 font-medium text-sm tracking-wide uppercase">at {restaurant?.name}</p>
                    </div>

                    {/* Star Rating */}
                    <div className="flex justify-center gap-3 md:gap-6 mb-20">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                className="relative group transition-all duration-500 transform active:scale-90"
                            >
                                <Star
                                    size={56}
                                    strokeWidth={1}
                                    className={cn(
                                        "transition-all duration-500",
                                        (hover || rating) >= star 
                                            ? "fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-110" 
                                            : "text-[#D4AF37]/20 fill-[#FCFBF7]"
                                    )}
                                />
                                <div className={cn(
                                    "absolute -bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] transition-all duration-700",
                                    rating === star ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                )} />
                            </button>
                        ))}
                    </div>

                    {/* High Rating Content */}
                    {rating >= 4 && (
                        <div className="space-y-10 animate-in slide-in-from-top-6 duration-700">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em] ml-2">Guest Identity</p>
                                    <Input
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Full Name"
                                        className="h-14 rounded-2xl border-[#F4EBD0] bg-[#FCFBF7]/50 font-bold text-sm px-6 focus:ring-[#D4AF37] transition-all text-[#1A1A1A]"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em] ml-2">Contact Link</p>
                                    <Input
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Phone Number"
                                        className="h-14 rounded-2xl border-[#F4EBD0] bg-[#FCFBF7]/50 font-bold text-sm px-6 focus:ring-[#D4AF37] transition-all text-[#1A1A1A]"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-20 rounded-full bg-[#1A1A1A] hover:bg-black text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all transform active:scale-[0.98] group flex items-center justify-center gap-4"
                            >
                                {submitting ? (
                                    <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Endorse on Google <Navigation className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform text-[#D4AF37]" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Footer decoration */}
                    <div className="mt-16 text-center">
                        <div className="inline-block h-0.5 w-16 bg-[#F4EBD0] rounded-full" />
                    </div>
                </div>
                
                <p className="text-center mt-10 text-[#8B6508]/30 text-[9px] uppercase font-black tracking-[0.4em] leading-none">
                    Curated by {restaurant?.name || 'Grand Banquet'}
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
