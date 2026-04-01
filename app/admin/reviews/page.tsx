'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Star,
    MessageSquare,
    TrendingUp,
    RefreshCw,
    Search,
    Smartphone,
    Download
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { supabase, RESTAURANT_ID, getRestaurantId } from '@/lib/supabase'
import { format } from 'date-fns'
import { QRCodeCanvas } from 'qrcode.react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ReviewLog {
    id: string
    customer_name: string
    customer_phone: string
    rating: number
    feedback: string
    created_at: string
}

export default function ReviewTerminalPage() {
    const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([])
    const [restaurant, setRestaurant] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true)

            // 🔄 SUPER SYNC: Check all possible ID sources
            const currentId = getRestaurantId() || RESTAURANT_ID || localStorage.getItem('admin_restaurant_id') || localStorage.getItem('tenant_id')

            if (!currentId) {
                console.error('❌ [Review Sync] CRITICAL: No Restaurant ID detected in any source.')
                setLoading(false)
                return
            }

            console.log('📡 [Review Sync] Syncing reviews for ID:', currentId)

            // 🔄 Optimized Fetch with table-isolation
            const [customerData, logData] = await Promise.all([
                supabase.from('customer_reviews').select('*').eq('restaurant_id', currentId).order('created_at', { ascending: false }).then(r => r.data || []),
                supabase.from('review_logs').select('*').eq('restaurant_id', currentId).order('created_at', { ascending: false }).then(r => r.data || [])
            ])

            const combined = [...customerData, ...logData]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setReviewLogs(combined)

            // Sync Restaurant Name for the terminal display
            const { data: restro } = await supabase.from('restaurants').select('name').eq('id', currentId).single()
            if (restro) setRestaurant(restro)

        } catch (error) {
            console.error('❌ [Review Sync] Fatal Fetch Error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    const filteredLogs = useMemo(() => {
        return reviewLogs.filter(log =>
            log.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            log.customer_phone?.includes(search)
        )
    }, [reviewLogs, search])

    const stats = useMemo(() => {
        if (reviewLogs.length === 0) return { total: 0, avgRating: 0, highRatings: 0 }
        const total = reviewLogs.length
        const sum = reviewLogs.reduce((acc, curr) => acc + curr.rating, 0)
        const highRatings = reviewLogs.filter(r => r.rating >= 4).length
        return { total, avgRating: sum / total, highRatings }
    }, [reviewLogs])

    const handleDownload = () => {
        const canvas = document.getElementById('feedback-qr') as HTMLCanvasElement
        if (!canvas) return
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `feedback-qr-${restaurant?.name || 'terminal'}.png`
        link.href = url
        link.click()
        toast.success('QR Code Downloaded!')
    }

    const RatingStars = ({ rating }: { rating: number }) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                        key={s}
                        size={10}
                        className={cn(s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')}
                    />
                ))}
            </div>
        )
    }

    if (!mounted) return null

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-slate-50/20 min-h-screen">
            <div className="font-sans">
                <PageHeader
                    title="Review Automation"
                    description="Monitor feedback and manage live terminal"
                >
                    <div className="flex items-center gap-3">
                        {loading && <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            System: Live Sync Active
                        </Badge>
                        <Button variant="outline" size="sm" onClick={fetchReviews} className="rounded-xl border-indigo-100 text-indigo-600 h-10 px-6 bg-white hover:bg-indigo-50">
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Total Logs', value: stats.total, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
                            { label: 'Avg Rating', value: stats.avgRating.toFixed(1) + '★', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                            { label: 'Verified VIPs', value: stats.highRatings, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                        ].map(stat => (
                            <Card key={stat.label} className={cn('border border-indigo-50 shadow-sm rounded-2xl overflow-hidden', stat.bg)}>
                                <CardContent className="p-6 flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className={cn('text-2xl font-bold mt-1 italic', stat.color)}>{stat.value}</p>
                                    </div>
                                    <stat.icon className={cn('h-4 w-4 opacity-50', stat.color)} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border border-indigo-50 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-b border-slate-50">
                            <CardTitle className="text-xl font-bold text-slate-900 italic">Review Repository</CardTitle>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Filter Feed..."
                                    className="pl-10 h-10 rounded-xl border-none bg-slate-50 font-bold text-xs"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Syncing...</div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="text-center py-12 text-slate-200 uppercase font-black tracking-widest text-[10px]">No Signals Logged</div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {filteredLogs.map(log => (
                                        <div key={log.id} className="flex items-start gap-4 p-6 hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-indigo-600 group">
                                            <div className="shrink-0">
                                                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm',
                                                    log.rating >= 4 ? 'bg-emerald-500 shadow-emerald-200' : log.rating >= 3 ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'
                                                )}>
                                                    {log.rating}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-slate-900">{log.customer_name || 'Guest'}</p>
                                                    <RatingStars rating={log.rating} />
                                                    {log.customer_phone && <span className="text-[10px] text-slate-400 font-medium">({log.customer_phone})</span>}
                                                </div>
                                                <p className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-indigo-50 shadow-sm leading-relaxed">{log.feedback || 'No comment provided'}</p>
                                            </div>
                                            <div className="shrink-0 text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(log.created_at), 'HH:mm')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 h-full sticky top-32">
                    <Card className="border border-indigo-50 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col">
                        <div className="bg-slate-900 p-6 text-white flex flex-col items-center text-center">
                            <Star className="h-6 w-6 text-amber-500 fill-amber-500 mb-2 animate-pulse" />
                            <h2 className="text-xl font-bold italic uppercase tracking-tighter">Feedback Unit</h2>
                        </div>

                        <CardContent className="p-8 flex flex-col items-center gap-8">
                            <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 border-2 border-slate-50 group">
                                <QRCodeCanvas
                                    id="feedback-qr"
                                    value={`${window.location.protocol}//${window.location.host}/customer/review?id=${RESTAURANT_ID}`}
                                    size={1024}
                                    style={{ width: '100%', height: 'auto' }}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <div className="space-y-4 w-full">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                    <Smartphone className="h-6 w-6 text-indigo-600 shrink-0" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-snug">Terminal Live</p>
                                </div>
                                <Button
                                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest shadow-lg"
                                    onClick={handleDownload}
                                >
                                    <Download className="h-4 w-4 mr-3" />
                                    Download QR Code
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
