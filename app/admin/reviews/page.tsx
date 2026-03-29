'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Star,
    MessageSquare,
    TrendingUp,
    RefreshCw,
    Search,
    Smartphone,
    QrCode
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

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
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true)
            const { data } = await supabase
                .from('review_logs')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
            setReviewLogs(data || [])
        } catch (error) {
            console.error('Error fetching reviews:', error)
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

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-slate-50/20 min-h-screen">
            {/* Global Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                    }
                    nav, aside, button, header, .no-print, [role="banner"], [role="navigation"] {
                        display: none !important;
                    }
                    .print-section {
                        display: block !important;
                        position: absolute;
                        top: 50% !important;
                        left: 50% !important;
                        transform: translate(-50%, -50%) scale(1.5) !important;
                        border: none !important;
                        box-shadow: none !important;
                        width: auto !important;
                    }
                    .main-content {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `}</style>

            <div className="no-print">
                <PageHeader
                    title="Review Automation"
                    description="Monitor feedback and manage live terminal"
                >
                    <Button variant="outline" size="sm" onClick={fetchReviews} className="rounded-xl border-indigo-100 text-indigo-600 h-10 px-6">
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                </PageHeader>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6 no-print">
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
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 italic">Review Repository</CardTitle>
                            </div>
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
                                <div className="p-12 text-center text-slate-300">Syncing...</div>
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
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-slate-900">{log.customer_name}</p>
                                                    <RatingStars rating={log.rating} />
                                                </div>
                                                <p className="text-[11px] text-slate-500 italic bg-white p-3 rounded-xl border border-indigo-50 shadow-sm leading-snug">{log.feedback || 'No comment provided'}</p>
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
                    <Card className="print-section border border-indigo-50 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col">
                        <div className="bg-slate-900 p-6 text-white flex flex-col items-center text-center no-print-visible">
                            <Star className="h-6 w-6 text-amber-500 fill-amber-500 mb-2 animate-pulse" />
                            <h2 className="text-xl font-bold italic">Feedback Unit</h2>
                        </div>
                        
                        <CardContent className="p-8 flex flex-col items-center gap-8">
                            <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 border-2 border-slate-50 group transition-transform duration-500">
                                <QRCodeSVG 
                                    value={`${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${typeof window !== 'undefined' ? window.location.host : ''}/customer/review?id=${RESTAURANT_ID}`}
                                    size={180}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <div className="space-y-4 w-full no-print">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                    <Smartphone className="h-6 w-6 text-indigo-600 shrink-0" />
                                    <p className="text-[10px] font-medium text-slate-500 leading-snug italic truncate">Scan & rate terminal live.</p>
                                </div>
                                <Button 
                                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest shadow-lg"
                                    onClick={() => window.print()}
                                >
                                    <QrCode className="h-4 w-4 mr-3" />
                                    Export & Print
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
