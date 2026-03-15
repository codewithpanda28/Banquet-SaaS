'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Star, MessageSquare, TrendingUp, Search, AlertCircle, CheckCircle2
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ReviewLog { id: string; customer_name: string; customer_phone: string; rating: number; feedback?: string; created_at: string }

export default function ReviewsPage() {
    const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([])
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({ total: 0, avgRating: 0, highRatings: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReviews()

        const ch = supabase.channel('reviews-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'review_logs' }, fetchReviews)
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [])

    async function fetchReviews() {
        if (!RESTAURANT_ID) return

        try {
            const { data, error } = await supabase.from('review_logs')
                .select('*').eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false }).limit(100)

            if (error) throw error

            const logs = data || []
            setReviewLogs(logs)
            
            const total = logs.length
            const avgRating = total > 0 ? logs.reduce((s: number, r: ReviewLog) => s + r.rating, 0) / total : 0
            const highRatings = logs.filter((r: ReviewLog) => r.rating >= 4).length
            
            setStats({ total, avgRating, highRatings })
        } catch (error) {
            console.error('❌ [Reviews] Fetch error:', error)
            toast.error('Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = reviewLogs.filter(r =>
        r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_phone?.includes(search)
    )

    const RatingStars = ({ rating }: { rating: number }) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn(
                    'h-3 w-3',
                    s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'
                )} />
            ))}
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Customer Reviews"
                description="View and manage feedback submitted by your customers"
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Reviews', value: stats.total, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Avg Rating', value: stats.avgRating.toFixed(1) + '⭐', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'High Ratings (4★+)', value: stats.highRatings, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
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

            {/* Review Logs */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                    <div>
                        <CardTitle className="text-base text-black">Review History</CardTitle>
                        <CardDescription>{reviewLogs.length} reviews found in database</CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            placeholder="Search by name or phone..." 
                            className="pl-10 h-9 bg-gray-50 border-gray-200 text-black placeholder:text-gray-400" 
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading reviews...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>No reviews found</p>
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
                                        <div className="flex flex-col mt-0.5">
                                            {log.customer_phone && <p className="text-xs text-gray-400">{log.customer_phone}</p>}
                                            {log.feedback && (
                                                <p className="text-xs text-gray-600 bg-gray-100/50 p-2 rounded-lg mt-1 italic">
                                                    "{log.feedback}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight py-0">
                                            {log.rating >= 4 ? 'Positive' : 'Action Needed'}
                                        </Badge>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {format(new Date(log.created_at), 'MMM d, p')}
                                        </span>
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
