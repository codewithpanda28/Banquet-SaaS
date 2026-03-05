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
    Zap, Edit, Save, X, ArrowUpRight, Brain, RefreshCw, Plus, Search, Trash2
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MenuItem { id: string; name: string; price: number; category_id: string; is_veg: boolean; image_url?: string; is_bestseller?: boolean }
interface Category { id: string; name: string }
interface UpsellRule {
    id: string;
    trigger_item_id: string;
    suggest_item_id: string;
    message: string;
    priority: number;
    is_active: boolean;
    trigger_item?: MenuItem;
    suggest_item?: MenuItem;
}

// AI-generated upsell suggestions (simulated - in production use OpenAI)
const generateUpsellMessage = (trigger: string, suggest: string, margin: string) =>
    `Customers who order ${trigger} love pairing it with ${suggest}! Add it now to enhance your meal. ${margin ? `(${margin}% margin item)` : ''}`

export default function AIUpsellPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [editingRule, setEditingRule] = useState<string | null>(null)
    const [editMessage, setEditMessage] = useState('')
    const [topItems, setTopItems] = useState<{ name: string; revenue: number; orders: number }[]>([])
    const [aiSuggestions, setAiSuggestions] = useState<{ trigger: string; suggest: string; reason: string; estimatedRevenue: number }[]>([])

    const [ruleSearch, setRuleSearch] = useState('')
    const [manualForm, setManualForm] = useState({
        triggerId: '',
        suggestId: '',
        message: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const [{ data: items }, { data: rules }, { data: cats }] = await Promise.all([
            supabase.from('menu_items').select('*').eq('restaurant_id', RESTAURANT_ID).eq('is_available', true),
            supabase.from('upsell_rules').select('*, trigger_item:menu_items!trigger_item_id(*), suggest_item:menu_items!suggest_item_id(*)').eq('restaurant_id', RESTAURANT_ID).order('priority'),
            supabase.from('categories').select('id, name').eq('restaurant_id', RESTAURANT_ID)
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

        setCategories(cats || [])
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

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Create Manual Rule */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-primary/20 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent border-b border-primary/10">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" /> Create Manual Rule
                            </CardTitle>
                            <CardDescription>Custom triggers for your menu</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Step 1: If Customer Adds:</Label>
                                <Select
                                    value={manualForm.triggerId}
                                    onValueChange={(v) => setManualForm(prev => ({ ...prev, triggerId: v }))}
                                >
                                    <SelectTrigger className="w-full h-11 bg-gray-50/50 border-gray-200">
                                        <SelectValue placeholder="Select Trigger Item" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 z-[100]">
                                        {categories.length > 0 ? categories.map(cat => (
                                            <SelectGroup key={cat.id}>
                                                <SelectLabel className="px-2 py-1.5 text-[10px] font-black text-gray-400 uppercase bg-gray-100/50">{cat.name}</SelectLabel>
                                                {menuItems.filter(i => i.category_id === cat.id).map(item => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )) : menuItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Step 2: Suggest This Item:</Label>
                                <Select
                                    value={manualForm.suggestId}
                                    onValueChange={(v) => setManualForm(prev => ({ ...prev, suggestId: v }))}
                                >
                                    <SelectTrigger className="w-full h-11 bg-gray-50/50 border-gray-200">
                                        <SelectValue placeholder="Select Suggestion" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 z-[100]">
                                        {categories.length > 0 ? categories.map(cat => (
                                            <SelectGroup key={cat.id}>
                                                <SelectLabel className="px-2 py-1.5 text-[10px] font-black text-gray-400 uppercase bg-gray-100/50">{cat.name}</SelectLabel>
                                                {menuItems.filter(i => i.category_id === cat.id).map(item => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )) : menuItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Step 3: Custom Message (Optional):</Label>
                                <Textarea
                                    placeholder="E.g. Great choice! Add a cold drink to finish your meal."
                                    value={manualForm.message}
                                    onChange={(e) => setManualForm(prev => ({ ...prev, message: e.target.value }))}
                                    className="h-20 text-xs resize-none bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                                />
                            </div>

                            <Button
                                className="w-full h-12 rounded-xl font-bold shadow-lg bg-primary hover:bg-primary/90 shadow-primary/20 transition-all active:scale-[0.98]"
                                onClick={() => {
                                    if (!manualForm.triggerId || !manualForm.suggestId) {
                                        toast.error('Select both trigger and suggestion items')
                                        return
                                    }
                                    const trigger = menuItems.find(m => m.id === manualForm.triggerId)?.name || ''
                                    const suggest = menuItems.find(m => m.id === manualForm.suggestId)?.name || ''
                                    saveRule(
                                        manualForm.triggerId,
                                        manualForm.suggestId,
                                        manualForm.message || generateUpsellMessage(trigger, suggest, '')
                                    )
                                    setManualForm({ triggerId: '', suggestId: '', message: '' })
                                }}
                            >
                                <Save className="h-4 w-4 mr-2" /> Save Promotion Rule
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview Card */}
                    {manualForm.triggerId && manualForm.suggestId && (
                        <Card className="border-orange-200 bg-orange-50/30 overflow-hidden animate-in zoom-in-95">
                            <CardHeader className="p-4 border-b border-orange-100">
                                <CardTitle className="text-xs font-black uppercase text-orange-600 flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5" /> Live Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 space-y-3">
                                    <div className="flex gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                                            {menuItems.find(m => m.id === manualForm.suggestId)?.image_url && (
                                                <img src={menuItems.find(m => m.id === manualForm.suggestId)?.image_url} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900">{menuItems.find(m => m.id === manualForm.suggestId)?.name}</p>
                                            <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">
                                                {manualForm.message || generateUpsellMessage(
                                                    menuItems.find(m => m.id === manualForm.triggerId)?.name || '',
                                                    menuItems.find(m => m.id === manualForm.suggestId)?.name || '',
                                                    ''
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" className="w-full bg-orange-500 text-[10px] h-8 font-bold">Add to Order +₹{menuItems.find(m => m.id === manualForm.suggestId)?.price}</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Active Upsell Rules */}
                <Card className="border-gray-100 shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-gray-100 pb-4 bg-white sticky top-0 z-10">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary fill-primary/20" /> Active Promotions
                                </CardTitle>
                                <CardDescription>Currently driving {upsellRules.length} product pairings</CardDescription>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by product name..."
                                    className="pl-10 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl"
                                    value={ruleSearch}
                                    onChange={(e) => setRuleSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        {upsellRules.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Zap className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                <p className="text-sm font-medium">No active promotions yet</p>
                                <p className="text-xs mt-1">Start by creating a manual rule or use AI suggestions</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[800px] scrollbar-hide">
                                {upsellRules
                                    .filter(r =>
                                        getItemName(r.trigger_item_id).toLowerCase().includes(ruleSearch.toLowerCase()) ||
                                        getItemName(r.suggest_item_id).toLowerCase().includes(ruleSearch.toLowerCase())
                                    )
                                    .map(rule => (
                                        <div key={rule.id} className={cn(
                                            'p-5 transition-all group hover:bg-gray-50/80',
                                            !rule.is_active && 'opacity-60 bg-gray-50/40'
                                        )}>
                                            <div className="flex items-start gap-4">
                                                {/* Rule Visual */}
                                                <div className="flex items-center gap-2 shrink-0 pt-1">
                                                    <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                                                        {rule.trigger_item?.image_url ? (
                                                            <img src={rule.trigger_item.image_url} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">Trigger</div>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-300">→</div>
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 overflow-hidden shadow-sm ring-2 ring-primary/5">
                                                        {rule.suggest_item?.image_url ? (
                                                            <img src={rule.suggest_item.image_url} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-[10px] text-primary">Suggest</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-black text-gray-900 truncate">
                                                            {getItemName(rule.trigger_item_id)}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] px-1 h-4 font-black uppercase text-gray-400 border-gray-200">Triggers</Badge>
                                                        <span className="text-gray-900 font-bold ml-1">{getItemName(rule.suggest_item_id)}</span>
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] h-4">₹{getItemPrice(rule.suggest_item_id)}</Badge>
                                                    </div>
                                                    {editingRule === rule.id ? (
                                                        <div className="flex gap-2 mt-3 p-3 bg-white rounded-xl border border-primary/20 shadow-inner">
                                                            <Textarea
                                                                value={editMessage}
                                                                onChange={e => setEditMessage(e.target.value)}
                                                                className="text-xs h-16 resize-none bg-gray-50 focus:bg-white"
                                                            />
                                                            <div className="flex flex-col gap-2">
                                                                <Button size="icon" className="h-8 w-8 bg-green-600 shadow-md shadow-green-200" onClick={() => saveEditMessage(rule.id)}><Save className="h-3.5 w-3.5" /></Button>
                                                                <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-gray-100" onClick={() => setEditingRule(null)}><X className="h-3.5 w-3.5" /></Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 font-medium italic mt-1.5 bg-gray-100/50 p-2 rounded-lg inline-block line-clamp-2 max-w-full">
                                                            "{rule.message}"
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0 pt-1">
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" onClick={() => {
                                                        setEditingRule(rule.id)
                                                        setEditMessage(rule.message)
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <button
                                                        onClick={() => toggleRule(rule.id, rule.is_active)}
                                                        className={cn('h-8 px-4 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-sm active:scale-95 mx-1',
                                                            rule.is_active
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200'
                                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                        )}
                                                    >
                                                        {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                                                    </button>
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => deleteRule(rule.id)}>
                                                        <Trash2 className="h-4 w-4" />
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
        </div>
    )
}
