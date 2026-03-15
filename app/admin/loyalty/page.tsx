'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Users,
    TrendingUp,
    Gift,
    Crown,
    Smartphone,
    UserPlus,
    Search,
    RefreshCw,
    Percent,
    Plus
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { triggerAutomationWebhook } from '@/lib/webhook'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Coupon } from '@/types'
import { cn } from '@/lib/utils'

interface CustomerStats {
    id: string
    name: string
    phone: string
    total_orders: number
    total_spent: number
    last_order_at: string
}

export default function LoyaltyHub() {
    const [customers, setCustomers] = useState<CustomerStats[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sendingCoupon, setSendingCoupon] = useState<string | null>(null)
    const [giftDialogOpen, setGiftDialogOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null)
    const [loyaltyCoupons, setLoyaltyCoupons] = useState<Coupon[]>([])
    const [selectedCouponId, setSelectedCouponId] = useState<string>('auto')
    const [customCoupon, setCustomCoupon] = useState({
        code: '',
        value: '20',
        validDays: '30'
    })

    const fetchLoyaltyData = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('total_spent', { ascending: false })

            if (error) throw error
            setCustomers(data || [])
        } catch (error) {
            console.error('Error fetching loyalty data:', error)
            toast.error('Failed to load customer data')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchLoyaltyCoupons = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('is_active', true)
                .like('description', '%[PRIVATE]%')
                .order('created_at', { ascending: false })

            if (error) throw error
            setLoyaltyCoupons(data || [])
        } catch (error) {
            console.error('Error fetching loyalty coupons:', error)
        }
    }, [])

    useEffect(() => {
        fetchLoyaltyData()
        fetchLoyaltyCoupons()
    }, [fetchLoyaltyData, fetchLoyaltyCoupons])

    const handleSendGift = (customer: CustomerStats) => {
        setSelectedCustomer(customer)
        setGiftDialogOpen(true)
        setSelectedCouponId('auto')
    }

    const handleFinalizeGift = async () => {
        if (!selectedCustomer) return

        try {
            setSendingCoupon(selectedCustomer.id)
            let couponCode = ''
            let validUntil: Date
            let discountValue = 20

            if (selectedCouponId === 'auto' || selectedCouponId === 'manual') {
                if (selectedCouponId === 'auto') {
                    const namePart = (selectedCustomer.name || 'LOYAL').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
                    const phonePart = (selectedCustomer.phone || '0000').slice(-4)
                    couponCode = `VIP-${namePart}-${phonePart}`
                    discountValue = 20
                } else {
                    if (!customCoupon.code || !customCoupon.value) {
                        toast.error('Please fill all manual coupon details')
                        return
                    }
                    couponCode = customCoupon.code.toUpperCase()
                    discountValue = parseFloat(customCoupon.value)
                }
                
                validUntil = new Date()
                validUntil.setDate(validUntil.getDate() + parseInt(customCoupon.validDays || '30'))

                if (!RESTAURANT_ID) {
                    toast.error('Restaurant ID missing. Please refresh.')
                    return
                }

                const couponData = {
                    restaurant_id: RESTAURANT_ID,
                    code: couponCode,
                    description: `[PRIVATE] Exclusive loyalty reward for ${selectedCustomer.name}`,
                    discount_type: 'percentage',
                    discount_value: discountValue,
                    min_order_amount: 0,
                    usage_limit: 1, 
                    used_count: 0,
                    is_active: true,
                    valid_from: new Date().toISOString(),
                    valid_until: validUntil.toISOString()
                }

                const { data: existing } = await supabase
                    .from('coupons')
                    .select('id')
                    .eq('restaurant_id', RESTAURANT_ID)
                    .eq('code', couponCode)
                    .single()

                let couponError;
                if (existing) {
                    const { error } = await supabase.from('coupons').update(couponData).eq('id', existing.id)
                    couponError = error
                } else {
                    const { error } = await supabase.from('coupons').insert(couponData)
                    couponError = error
                }

                if (couponError) throw couponError
            } else {
                const selectedCoupon = loyaltyCoupons.find(c => c.id === selectedCouponId)
                if (!selectedCoupon) return
                couponCode = selectedCoupon.code
                validUntil = new Date(selectedCoupon.valid_until)
            }

            const formattedDate = validUntil.toLocaleDateString('en-GB') // DD/MM/YYYY format

            const message = 
                `SPECIAL LOYALTY REWARD\n\n` +
                `Hi ${selectedCustomer.name},\n\n` +
                `We truly value your continued support. As a token of our appreciation, we have activated an exclusive discount for you!\n\n` +
                `COUPON CODE: ${couponCode}\n` +
                `VALID UNTIL: ${formattedDate}\n\n` +
                `How to use: Simply enter the code above during checkout on your next order.\n\n` +
                `Thank you for being a part of our family!\n\n` +
                `Akash's Restaurant`

            // Trigger Webhook using a distinct type to avoid n8n auto-replies
            await triggerAutomationWebhook('loyalty-gift' as any, {
                type: 'loyalty_gift',
                phone: selectedCustomer.phone,
                customer: { name: selectedCustomer.name, phone: selectedCustomer.phone },
                coupon_code: couponCode,
                is_exclusive: true,
                message
            })

            // Direct WhatsApp Trigger
            const waPhone = selectedCustomer.phone.replace(/[^0-9]/g, '')
            const finalPhone = waPhone.length === 10 ? `91${waPhone}` : waPhone
            const waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
            window.open(waUrl, '_blank')

            toast.success(`Coupon ${couponCode} shared with customer! 🎁`)
            setGiftDialogOpen(false)
        } catch (error) {
            console.error('Gift error:', error)
            toast.error('Failed to send gift')
        } finally {
            setSendingCoupon(null)
        }
    }

    const filteredCustomers = customers.filter(c =>
    (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery))
    )

    const repeatCustomerCount = customers.filter(c => c.total_orders > 1).length
    const repeatRate = customers.length > 0 ? (repeatCustomerCount / customers.length) * 100 : 0
    const vipCustomers = customers.filter(c => c.total_spent >= 400)

    if (loading && customers.length === 0) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <PageHeader
                title="VIP Loyalty Hub"
                description="Manage your top spenders and automate retention gifts"
            >
                <Button variant="outline" size="sm" onClick={fetchLoyaltyData} className="rounded-xl">
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
                </Button>
            </PageHeader>

            {/* Loyalty Metrics */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-[2rem] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Crown size={120} />
                    </div>
                    <CardContent className="p-8">
                        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Repeat Customer Rate</p>
                        <h3 className="text-5xl font-black mb-4">{repeatRate.toFixed(1)}%</h3>
                        <div className="flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                            <TrendingUp size={14} />
                            <span>{repeatCustomerCount} returning legends</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-blue-600 text-white rounded-[2rem] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Users size={120} />
                    </div>
                    <CardContent className="p-8">
                        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Total Customer Base</p>
                        <h3 className="text-5xl font-black mb-4">{customers.length}</h3>
                        <div className="flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                            <UserPlus size={14} />
                            <span>{customers.filter(c => {
                                const today = new Date().toISOString().split('T')[0]
                                return c.last_order_at?.startsWith(today)
                            }).length} active today</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-amber-500 text-white rounded-[2rem] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Gift size={120} />
                    </div>
                    <CardContent className="p-8">
                        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">VIP Candidates</p>
                        <h3 className="text-5xl font-black mb-4">{vipCustomers.length}</h3>
                        <div className="flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                            <Percent size={14} />
                            <span>Spent ₹400+</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by name or phone number..."
                        className="pl-10 h-12 rounded-xl border-gray-100 bg-gray-50/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Top Spenders Table */}
            <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-gray-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-black text-gray-900">Top Spenders Leaderboard</CardTitle>
                            <CardDescription>Customers ranked by total wallet spend</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Rank</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Customer</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Orders</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Spent</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Loyalty Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.slice(0, 20).map((customer, index) => (
                                    <tr key={customer.id} className="hover:bg-green-50/30 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className={cn(
                                                "h-10 w-10 flex items-center justify-center rounded-xl font-black text-sm",
                                                index === 0 ? "bg-amber-100 text-amber-600 ring-2 ring-amber-500/20" :
                                                    index === 1 ? "bg-slate-100 text-slate-500 ring-2 ring-slate-500/20" :
                                                        index === 2 ? "bg-orange-100 text-orange-600 ring-2 orange-500/20" :
                                                            "bg-gray-100 text-gray-500"
                                            )}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                    <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                                                        {customer.name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-gray-900 flex items-center gap-2">
                                                        {customer.name}
                                                        {customer.total_spent >= 400 && (
                                                            <Crown size={14} className="text-amber-500 fill-amber-500" />
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-medium">{customer.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-0 font-bold text-xs px-3">
                                                {customer.total_orders} Orders
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-lg font-black text-gray-900">₹{customer.total_spent.toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSendGift(customer)}
                                                disabled={sendingCoupon === customer.id || customer.total_spent < 400}
                                                className={cn(
                                                    "rounded-xl font-bold gap-2 px-4 shadow-sm h-10 transition-all",
                                                    customer.total_spent >= 400
                                                        ? "bg-green-600 hover:bg-green-700 text-white shadow-green-500/20"
                                                        : "bg-gray-100 text-gray-400 border-0 cursor-not-allowed"
                                                )}
                                            >
                                                {sendingCoupon === customer.id ? (
                                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (
                                                    <Gift size={16} />
                                                )}
                                                Send Loyal Gift
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            {/* Gift Selection Dialog */}
            <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
                <DialogContent className="glass-panel border-white/10 bg-background/95 backdrop-blur-xl sm:rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Gift className="text-amber-500" />
                            Send Loyal Gift to {selectedCustomer?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Choose an existing loyalty coupon or create a new personalized one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Select Coupon
                            </label>
                            <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                                <SelectTrigger className="bg-secondary/20 border-border/50 h-12">
                                    <SelectValue placeholder="Chose a coupon..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto" className="font-bold text-amber-600">
                                        ✨ Auto: Personalized (VIP-UNIQUE)
                                    </SelectItem>
                                    <SelectItem value="manual" className="font-bold text-blue-600">
                                        ➕ Create New Custom Coupon
                                    </SelectItem>
                                    {loyaltyCoupons.length > 0 && <div className="h-px bg-muted my-1" />}
                                    {loyaltyCoupons.map((coupon) => (
                                        <SelectItem key={coupon.id} value={coupon.id}>
                                            👑 {coupon.code} ({coupon.discount_value}% OFF)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedCouponId === 'manual' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Coupon Code</label>
                                    <Input 
                                        placeholder="e.g. SPECIAL50" 
                                        value={customCoupon.code}
                                        onChange={(e) => setCustomCoupon({...customCoupon, code: e.target.value.toUpperCase()})}
                                        className="h-10 font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Discount %</label>
                                    <Input 
                                        type="number" 
                                        placeholder="20" 
                                        value={customCoupon.value}
                                        onChange={(e) => setCustomCoupon({...customCoupon, value: e.target.value})}
                                        className="h-10 font-bold"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Validity (Days)</label>
                                    <Input 
                                        type="number" 
                                        placeholder="30" 
                                        value={customCoupon.validDays}
                                        onChange={(e) => setCustomCoupon({...customCoupon, validDays: e.target.value})}
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setGiftDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleFinalizeGift} 
                            disabled={!!sendingCoupon}
                            className="bg-amber-500 hover:bg-amber-600 font-bold px-8 shadow-lg shadow-amber-500/20"
                        >
                            {sendingCoupon ? 'Activating...' : 'Confirm & Send to WhatsApp'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
