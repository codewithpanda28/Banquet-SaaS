'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Star, Send, MessageSquare, TrendingUp, ExternalLink,
    Settings, CheckCircle2, AlertCircle, Search, Phone, Zap
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ReviewLog { id: string; customer_name: string; customer_phone: string; rating: number; google_link_sent: boolean; feedback?: string; created_at: string }

export default function ReviewsPage() {
    const [googleLink, setGoogleLink] = useState('')
    const [threshold, setThreshold] = useState(4)
    const [savingSettings, setSavingSettings] = useState(false)
    const [manualRating, setManualRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [manualPhone, setManualPhone] = useState('')
    const [manualName, setManualName] = useState('')
    const [manualFeedback, setManualFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([])
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({ total: 0, googleSent: 0, avgRating: 0, highRatings: 0 })

    useEffect(() => {
        loadSettings()
        fetchReviews()

        const ch = supabase.channel('reviews-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'review_logs' }, fetchReviews)
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [])

    async function loadSettings() {
        const { data } = await supabase.from('restaurants').select('google_review_link, review_threshold').eq('id', RESTAURANT_ID).single()
        if (data) {
            setGoogleLink(data.google_review_link || '')
            setThreshold(data.review_threshold || 4)
        }
    }

    async function fetchReviews() {
        const { data } = await supabase.from('review_logs')
            .select('*').eq('restaurant_id', RESTAURANT_ID)
            .order('created_at', { ascending: false }).limit(100)

        const logs = data || []
        setReviewLogs(logs)
        const total = logs.length
        const googleSent = logs.filter((r: ReviewLog) => r.google_link_sent).length
        const avgRating = total > 0 ? logs.reduce((s: number, r: ReviewLog) => s + r.rating, 0) / total : 0
        const highRatings = logs.filter((r: ReviewLog) => r.rating >= threshold).length
        setStats({ total, googleSent, avgRating, highRatings })
    }

    async function saveSettings() {
        if (!googleLink.trim()) { toast.error('Please enter your Google Review link'); return }
        setSavingSettings(true)
        const { error } = await supabase.from('restaurants').update({
            google_review_link: googleLink,
            review_threshold: threshold
        }).eq('id', RESTAURANT_ID)
        setSavingSettings(false)
        if (error) toast.error('Failed to save settings')
        else toast.success('Review settings saved!')
    }

    async function submitRating() {
        if (!manualRating) { toast.error('Please select a rating'); return }
        if (!manualName.trim()) { toast.error('Please enter customer name'); return }
        setSubmitting(true)

        try {
            const shouldSendGoogle = manualRating >= threshold
            await supabase.from('review_logs').insert({
                restaurant_id: RESTAURANT_ID,
                customer_name: manualName,
                customer_phone: manualPhone,
                rating: manualRating,
                feedback: manualFeedback,
                google_link_sent: shouldSendGoogle,
            })

            if (shouldSendGoogle && googleLink) {
                // Send WhatsApp with Google Review Link
                const phone = manualPhone.replace(/[^0-9]/g, '')
                const formattedPhone = phone.length === 10 ? '91' + phone : phone
                const message = encodeURIComponent(
                    `Hi ${manualName}! 🙏\n\nThank you for visiting us and for your ${manualRating}-star rating!\n\nWe'd love if you could share your experience on Google:\n${googleLink}\n\nIt really helps us grow! 🌟`
                )
                if (phone && formattedPhone) {
                    const waUrl = `https://wa.me/${formattedPhone}?text=${message}`
                    window.open(waUrl, '_blank')
                }
                toast.success(`${manualRating}⭐ rating logged! Google Review link sent via WhatsApp! 🎉`)
            } else {
                toast.info(`${manualRating}⭐ rating logged. Below threshold — no Google link sent.`)
            }

            setManualRating(0)
            setManualName('')
            setManualPhone('')
            setManualFeedback('')
            fetchReviews()
        } catch (err: any) {
            toast.error('Failed to log review: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredLogs = reviewLogs.filter(r =>
        r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_phone?.includes(search)
    )

    const RatingStars = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn(
                    size === 'lg' ? 'h-4 w-4' : 'h-3 w-3',
                    s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'
                )} />
            ))}
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Review Automation"
                description="Auto-send Google Review links to happy customers (4★+)"
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reviews', value: stats.total, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Google Links Sent', value: stats.googleSent, icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Avg Rating', value: stats.avgRating.toFixed(1) + '⭐', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'High Ratings', value: stats.highRatings, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(stat => (
                    <Card key={stat.label} className={cn('border-0', stat.bg)}>
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                    <p className={cn('text-2xl font-black mt-1', stat.color)}>{stat.value}</p>
                                </div>
                                <stat.icon className={cn('h-5 w-5 mt-1', stat.color)} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Automation Info */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Automation Webhook Active</p>
                            <p className="text-xs text-gray-500">External services can now send reviews to your dashboard via API</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <code className="text-[10px] bg-white px-3 py-2 rounded-lg border border-primary/10 font-bold text-primary flex-1 md:flex-none truncate">
                            /api/reviews/submit
                        </code>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white"
                            onClick={() => {
                                const url = `${window.location.origin}/api/reviews/submit`;
                                navigator.clipboard.writeText(url);
                                toast.success('Webhook URL copied!');
                            }}
                        >
                            Copy URL
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Settings */}
                <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Settings className="h-4 w-4 text-primary" /> Google Review Settings
                        </CardTitle>
                        <CardDescription>Configure the Google Review link and minimum rating threshold</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Google Review Link</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={googleLink}
                                    onChange={e => setGoogleLink(e.target.value)}
                                    placeholder="https://g.page/r/your-review-link"
                                    className="h-10 flex-1"
                                />
                                {googleLink && (
                                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => window.open(googleLink, '_blank')}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">Get this from your Google Business Profile → Get more reviews</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Minimum Stars to Send Google Link</Label>
                            <div className="flex gap-2">
                                {[3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setThreshold(n)}
                                        className={cn('flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all',
                                            threshold === n ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-primary/40'
                                        )}
                                    >
                                        {n}★+
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button className="w-full bg-primary text-white font-bold" onClick={saveSettings} disabled={savingSettings}>
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Manual Rating Capture */}
                <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Star className="h-4 w-4 text-amber-500" /> Capture Customer Rating
                        </CardTitle>
                        <CardDescription>Ask customer for rating and automatically send Google link if {threshold}★+</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Customer Name *</Label>
                            <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Rahul Sharma" className="h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Phone (for WhatsApp)</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="9876543210" className="pl-10 h-10" type="tel" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Rating *</Label>
                            <div className="flex gap-2 items-center">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button
                                        key={s}
                                        onMouseEnter={() => setHoverRating(s)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setManualRating(s)}
                                        className="transition-transform hover:scale-125"
                                    >
                                        <Star className={cn('h-8 w-8 transition-colors',
                                            s <= (hoverRating || manualRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'
                                        )} />
                                    </button>
                                ))}
                                {manualRating > 0 && (
                                    <span className={cn('ml-2 text-sm font-bold px-2 py-1 rounded-lg',
                                        manualRating >= threshold ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {manualRating >= threshold ? `✓ Google link will be sent` : `Below threshold`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Feedback (Optional)</Label>
                            <Input value={manualFeedback} onChange={e => setManualFeedback(e.target.value)} placeholder="Any comments from customer..." className="h-10" />
                        </div>
                        <Button
                            className="w-full bg-primary text-white font-bold h-11"
                            onClick={submitRating}
                            disabled={submitting || !manualRating}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {submitting ? 'Submitting...' : 'Submit & Auto-Send Link'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Review Logs */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <CardTitle className="text-base">Review History</CardTitle>
                        <CardDescription>{reviewLogs.length} reviews collected</CardDescription>
                    </div>
                    <div className="relative w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." className="pl-10 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>No reviews yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shrink-0',
                                        log.rating >= 4 ? 'bg-green-500' : log.rating >= 3 ? 'bg-amber-500' : 'bg-red-500'
                                    )}>
                                        {log.rating}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-900">{log.customer_name}</p>
                                            <RatingStars rating={log.rating} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {log.customer_phone && <p className="text-xs text-gray-400">{log.customer_phone}</p>}
                                            {log.feedback && <p className="text-xs text-gray-500 italic truncate">"{log.feedback}"</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {log.google_link_sent ? (
                                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Link Sent
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">
                                                <AlertCircle className="h-3 w-3 mr-1" /> Not Sent
                                            </Badge>
                                        )}
                                        <span className="text-xs text-gray-400">{format(new Date(log.created_at), 'MMM d, hh:mm a')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
