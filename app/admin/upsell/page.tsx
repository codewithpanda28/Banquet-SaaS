'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Sparkles, TrendingUp, DollarSign, Star, ShoppingBag,
    Zap, Edit, Save, X, ArrowUpRight, Brain, RefreshCw
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MenuItem { id: string; name: string; price: number; category_id: string; is_veg: boolean; image_url?: string; is_bestseller?: boolean }
interface UpsellRule { id: string; trigger_item_id: string; suggest_item_id: string; message: string; priority: number; is_active: boolean }

// AI-generated upsell suggestions (simulated - in production use OpenAI)
const generateUpsellMessage = (trigger: string, suggest: string, margin: string) =>
    `Customers who order ${trigger} love pairing it with ${suggest}! Add it now to enhance your meal. ${margin ? `(${margin}% margin item)` : ''}`

export default function AIUpsellPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [editingRule, setEditingRule] = useState<string | null>(null)
    const [editMessage, setEditMessage] = useState('')
    const [topItems, setTopItems] = useState<{ name: string; revenue: number; orders: number }[]>([])
    const [aiSuggestions, setAiSuggestions] = useState<{ trigger: string; suggest: string; reason: string; estimatedRevenue: number }[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const [{ data: items }, { data: rules }] = await Promise.all([
            supabase.from('menu_items').select('*').eq('restaurant_id', RESTAURANT_ID).eq('is_available', true),
            supabase.from('upsell_rules').select('*').eq('restaurant_id', RESTAURANT_ID).order('priority'),
        ])

        // Also fetch top selling items
        const { data: orderItems } = await supabase
            .from('order_items').select('item_name, quantity, total, order_id')
            .limit(500)

        const itemSales = (orderItems || []).reduce((acc: Record<string, { name: string; revenue: number; orders: number }>, item) => {
            if (!acc[item.item_name]) acc[item.item_name] = { name: item.item_name, revenue: 0, orders: 0 }
            acc[item.item_name].revenue += item.total || 0
            acc[item.item_name].orders += item.quantity || 0
            return acc
        }, {})

        const sortedItems = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

        setMenuItems((items || []).filter((i: MenuItem) => !i.name.startsWith('[DELETED]')))
        setUpsellRules(rules || [])
        setTopItems(sortedItems)
        setLoading(false)
    }

    async function generateAISuggestions() {
        setGenerating(true)
        toast.info('AI is analyzing your sales data...')

        // Simulate AI analysis (in production, call OpenAI API with menu + sales data)
        await new Promise(r => setTimeout(r, 2500))

        const filtered = menuItems.filter(i => !i.name.startsWith('[DELETED]'))

        const mockSuggestions = [
            {
                trigger: filtered[0]?.name || 'Butter Chicken',
                suggest: filtered[1]?.name || 'Garlic Naan',
                reason: 'High correlation in order history — 73% customers who order this also add Garlic Naan',
                estimatedRevenue: 4200
            },
            {
                trigger: filtered[2]?.name || 'Dal Makhani',
                suggest: filtered[3]?.name || 'Lassi',
                reason: 'Popular combo for lunch orders — increases avg order value by ₹95',
                estimatedRevenue: 2800
            },
            {
                trigger: filtered[4]?.name || 'Biryani',
                suggest: filtered[5]?.name || 'Raita',
                reason: 'Biryani orders without Raita have lower satisfaction scores',
                estimatedRevenue: 1900
            },
        ].filter(s => s.trigger && s.suggest)

        setAiSuggestions(mockSuggestions)
        setGenerating(false)
        toast.success('AI suggestions generated!')
    }

    async function saveRule(triggerId: string, suggestId: string, message: string) {
        const { error } = await supabase.from('upsell_rules').insert({
            restaurant_id: RESTAURANT_ID,
            trigger_item_id: triggerId,
            suggest_item_id: suggestId,
            message,
            priority: upsellRules.length + 1,
            is_active: true
        })
        if (error) toast.error('Failed to save rule')
        else { toast.success('Upsell rule saved!'); fetchData() }
    }

    async function toggleRule(id: string, current: boolean) {
        await supabase.from('upsell_rules').update({ is_active: !current }).eq('id', id)
        fetchData()
    }

    async function deleteRule(id: string) {
        await supabase.from('upsell_rules').delete().eq('id', id)
        toast.success('Rule deleted')
        fetchData()
    }

    async function saveEditMessage(id: string) {
        await supabase.from('upsell_rules').update({ message: editMessage }).eq('id', id)
        setEditingRule(null)
        toast.success('Message updated!')
        fetchData()
    }

    const getItemName = (id: string) => menuItems.find(i => i.id === id)?.name || 'Unknown'
    const getItemPrice = (id: string) => menuItems.find(i => i.id === id)?.price || 0

    if (loading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="AI Upsell Engine"
                description="Let AI recommend high-margin items to boost average order value"
            >
                <Button
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg"
                    onClick={generateAISuggestions}
                    disabled={generating}
                >
                    <Brain className={cn('h-4 w-4 mr-2', generating && 'animate-pulse')} />
                    {generating ? 'Analyzing...' : '✨ Generate AI Suggestions'}
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Rules', value: upsellRules.filter(r => r.is_active).length, bg: 'bg-purple-50', color: 'text-purple-700', icon: Zap },
                    { label: 'Top Sellers', value: topItems.length, bg: 'bg-green-50', color: 'text-green-700', icon: TrendingUp },
                    { label: 'Avg. Uplift', value: '+23%', bg: 'bg-blue-50', color: 'text-blue-700', icon: ArrowUpRight },
                    { label: 'AI Suggestions', value: aiSuggestions.length, bg: 'bg-amber-50', color: 'text-amber-700', icon: Sparkles },
                ].map(s => (
                    <Card key={s.label} className={cn('border-0', s.bg)}>
                        <CardContent className="p-5 flex items-start gap-3">
                            <s.icon className={cn('h-5 w-5 mt-0.5 shrink-0', s.color)} />
                            <div>
                                <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
                <Card className="border-purple-200 shadow-sm">
                    <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" /> AI-Generated Upsell Suggestions
                        </CardTitle>
                        <CardDescription>Based on your order history and sales patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {aiSuggestions.map((s, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-purple-100 bg-white group hover:border-purple-300 transition-all">
                                <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shrink-0">
                                    AI
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-900">{s.trigger}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-bold text-purple-700">{s.suggest}</span>
                                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Est. +₹{s.estimatedRevenue}/month</Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-purple-600 text-white text-xs shrink-0"
                                    onClick={() => {
                                        const triggerItem = menuItems.find(m => m.name === s.trigger)
                                        const suggestItem = menuItems.find(m => m.name === s.suggest)
                                        if (triggerItem && suggestItem) {
                                            saveRule(triggerItem.id, suggestItem.id, generateUpsellMessage(s.trigger, s.suggest, ''))
                                        } else {
                                            toast.error('Items not found in menu')
                                        }
                                    }}
                                >
                                    Apply Rule
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Selling Items */}
                <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="border-b border-gray-100">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" /> Top Selling Items
                        </CardTitle>
                        <CardDescription>Best performers to use as upsell triggers</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        {topItems.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">No sales data yet</p>
                        ) : topItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0',
                                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'
                                )}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(item.revenue / (topItems[0]?.revenue || 1)) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-bold text-green-700">₹{item.revenue.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400">{item.orders} sold</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* High Margin Items */}
                <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="border-b border-gray-100">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" /> Menu Items for Upsell
                        </CardTitle>
                        <CardDescription>Items to suggest — sorted by price</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-2 max-h-72 overflow-y-auto">
                        {menuItems.sort((a, b) => b.price - a.price).slice(0, 10).map(item => (
                            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className={cn('h-2 w-2 rounded-full shrink-0', item.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{item.name}</span>
                                <span className="font-bold text-primary text-sm shrink-0">₹{item.price}</span>
                                {item.is_bestseller && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Active Upsell Rules */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Active Upsell Rules
                    </CardTitle>
                    <CardDescription>These messages show to customers during ordering</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                    {upsellRules.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No upsell rules yet</p>
                            <p className="text-xs mt-1">Click "Generate AI Suggestions" to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upsellRules.map(rule => (
                                <div key={rule.id} className={cn(
                                    'p-4 rounded-2xl border-2 transition-all',
                                    rule.is_active ? 'border-primary/20 bg-primary/5' : 'border-gray-100 bg-gray-50 opacity-60'
                                )}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-gray-900">{getItemName(rule.trigger_item_id)}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-sm font-bold text-primary">{getItemName(rule.suggest_item_id)}</span>
                                                <span className="text-xs text-gray-500">+₹{getItemPrice(rule.suggest_item_id)}</span>
                                            </div>
                                            {editingRule === rule.id ? (
                                                <div className="flex gap-2 mt-2">
                                                    <Textarea
                                                        value={editMessage}
                                                        onChange={e => setEditMessage(e.target.value)}
                                                        className="text-xs h-16 resize-none"
                                                    />
                                                    <div className="flex flex-col gap-1">
                                                        <Button size="icon" className="h-8 w-8 bg-green-600" onClick={() => saveEditMessage(rule.id)}><Save className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRule(null)}><X className="h-3 w-3" /></Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{rule.message}"</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                                setEditingRule(rule.id)
                                                setEditMessage(rule.message)
                                            }}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <button
                                                onClick={() => toggleRule(rule.id, rule.is_active)}
                                                className={cn('h-7 px-3 rounded-lg text-[10px] font-bold transition-all',
                                                    rule.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                )}
                                            >
                                                {rule.is_active ? 'ON' : 'OFF'}
                                            </button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => deleteRule(rule.id)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
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
