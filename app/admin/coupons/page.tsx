'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Percent, DollarSign, Calendar, TrendingUp, Edit, Trash2, Copy, Tag, Clock, Crown } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Coupon } from '@/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
    const [couponForm, setCouponForm] = useState({
        code: '',
        description: '',
        discount_type: 'percentage' as 'percentage' | 'fixed',
        discount_value: '',
        min_order_amount: '',
        max_discount: '',
        usage_limit: '',
        valid_from: '',
        valid_until: '',
    })

    const [isLoyalMode, setIsLoyalMode] = useState(false)

    useEffect(() => {
        fetchCoupons()

        // Realtime subscription
        const channel = supabase
            .channel('coupons-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
                console.log('🔴 Coupons updated - refreshing...')
                fetchCoupons()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchCoupons() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })

            if (error) throw error
            setCoupons(data || [])
        } catch (error: any) {
            console.error('Error fetching coupons FULL:', JSON.stringify(error, null, 2))
            toast.error('Failed to load coupons')
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveCoupon() {
        try {
            if (!couponForm.code || !couponForm.discount_value || !couponForm.valid_until) {
                toast.error('Please fill all required fields')
                return
            }

            // Automatically add [PRIVATE] for loyal mode if not already there
            let finalDescription = couponForm.description;
            if (isLoyalMode && !finalDescription.startsWith('[PRIVATE]')) {
                finalDescription = `[PRIVATE] ${finalDescription}`.trim();
            }

            const couponData = {
                restaurant_id: RESTAURANT_ID,
                code: couponForm.code.toUpperCase(),
                description: finalDescription,
                discount_type: couponForm.discount_type,
                discount_value: parseFloat(couponForm.discount_value),
                min_order_amount: parseFloat(couponForm.min_order_amount) || 0,
                max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
                usage_limit: parseInt(couponForm.usage_limit) || 0,
                valid_from: couponForm.valid_from || new Date().toISOString(),
                valid_until: new Date(couponForm.valid_until).toISOString(),
                is_active: true,
                used_count: editingCoupon ? editingCoupon.used_count : 0,
            }

            if (editingCoupon) {
                const { error } = await supabase
                    .from('coupons')
                    .update(couponData)
                    .eq('id', editingCoupon.id)

                if (error) throw error
                toast.success('Coupon updated successfully')
            } else {
                const { error } = await supabase
                    .from('coupons')
                    .insert(couponData)

                if (error) throw error
                toast.success(isLoyalMode ? 'Loyal Coupon created! 👑' : 'Coupon created successfully')
            }

            setDialogOpen(false)
            resetForm()
            fetchCoupons()
        } catch (error) {
            console.error('Error saving coupon:', error)
            toast.error('Failed to save coupon')
        }
    }

    async function handleDeleteCoupon(id: string) {
        if (!confirm('Are you sure you want to delete this coupon?')) return

        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Coupon deleted successfully')
            fetchCoupons()
        } catch (error) {
            console.error('Error deleting coupon:', error)
            toast.error('Failed to delete coupon')
        }
    }

    async function handleToggleStatus(coupon: Coupon) {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ is_active: !coupon.is_active })
                .eq('id', coupon.id)

            if (error) throw error
            toast.success(`Coupon ${coupon.is_active ? 'deactivated' : 'activated'}`)
            fetchCoupons()
        } catch (error) {
            console.error('Error toggling status:', error)
            toast.error('Failed to update status')
        }
    }

    function resetForm() {
        setCouponForm({
            code: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            min_order_amount: '',
            max_discount: '',
            usage_limit: '',
            valid_from: '',
            valid_until: '',
        })
        setEditingCoupon(null)
    }

    function openEditCoupon(coupon: Coupon) {
        setEditingCoupon(coupon)
        setCouponForm({
            code: coupon.code,
            description: coupon.description || '',
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value.toString(),
            min_order_amount: coupon.min_order_amount.toString(),
            max_discount: coupon.max_discount?.toString() || '',
            usage_limit: coupon.usage_limit.toString(),
            valid_from: coupon.valid_from.split('T')[0],
            valid_until: coupon.valid_until.split('T')[0],
        })
        setDialogOpen(true)
    }

    function copyCode(code: string) {
        navigator.clipboard.writeText(code)
        toast.success('Coupon code copied!')
    }

    function isExpired(date: string) {
        return new Date(date) < new Date()
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Deals...</p>
                </div>
            </div>
        )
    }

    const activeCoupons = coupons.filter(c => c.is_active && !isExpired(c.valid_until))
    const totalUsage = coupons.reduce((sum, c) => sum + c.used_count, 0)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Offers & Coupons"
                description="Create exciting deals for your customers"
            >
                <div className="flex gap-3">
                    <Button onClick={() => {
                        setIsLoyalMode(false)
                        resetForm()
                        setDialogOpen(true)
                    }} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Normal Coupon
                    </Button>
                    <Button onClick={() => {
                        setIsLoyalMode(true)
                        resetForm()
                        setDialogOpen(true)
                    }} className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20">
                        <Crown className="mr-2 h-4 w-4" />
                        Create Loyal Coupon
                    </Button>
                </div>
            </PageHeader>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                    <CardContent className="p-6 relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Coupons</p>
                            <p className="text-3xl font-black mt-2 text-foreground">{coupons.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Tag className="h-6 w-6 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                    <CardContent className="p-6 relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Deals</p>
                            <p className="text-3xl font-black mt-2 text-green-500">{activeCoupons.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                    <CardContent className="p-6 relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Redemptions</p>
                            <p className="text-3xl font-black mt-2 text-blue-500">{totalUsage}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <DollarSign className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>            {/* Coupons List */}
            <div className="space-y-4">
                {coupons.length === 0 ? (
                    <div className="glass-panel p-12 text-center rounded-3xl border-dashed">
                        <Tag className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-xl font-medium text-muted-foreground mb-4">No active coupons found</p>
                        <Button variant="outline" onClick={() => setDialogOpen(true)}>Create your first deal</Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {coupons.map((coupon) => {
                            const isLoyalGift = coupon.description?.includes('[PRIVATE]');
                            const cleanDescription = coupon.description?.replace('[PRIVATE]', '').trim();
                            const active = coupon.is_active && !isExpired(coupon.valid_until);

                            return (
                                <div
                                    key={coupon.id}
                                    className={cn(
                                        "glass-card p-0 rounded-2xl border border-white/5 overflow-hidden group relative transition-all duration-300",
                                        !coupon.is_active || isExpired(coupon.valid_until) ? "opacity-70 grayscale" : "hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl",
                                        isLoyalGift && active && "border-amber-400/30"
                                    )}
                                >
                                    {/* Loyal Gift Badge */}
                                    {isLoyalGift && (
                                        <div className="absolute top-3 right-3 z-30">
                                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-[10px] font-black tracking-widest flex items-center gap-1 shadow-lg shadow-amber-500/20 px-2">
                                                <Crown size={10} className="fill-white" />
                                                LOYAL REWARD
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Dashed Separator Effect */}
                                    <div className="absolute left-0 top-1/2 -ml-2 w-4 h-4 rounded-full bg-background z-20" />
                                    <div className="absolute right-0 top-1/2 -mr-2 w-4 h-4 rounded-full bg-background z-20" />
                                    <div className="absolute left-[2px] right-[2px] top-1/2 border-t-2 border-dashed border-white/10 z-10" />

                                    {/* Top Section: Value & Code */}
                                    <div className={cn(
                                        "p-6 pb-8 flex flex-col items-center justify-center text-center",
                                        isLoyalGift ? "bg-gradient-to-b from-amber-500/10 to-transparent" : "bg-gradient-to-b from-primary/10 to-transparent"
                                    )}>
                                        <div className="mb-2">
                                            {coupon.discount_type === 'percentage' ? (
                                                <span className={cn("text-5xl font-black", isLoyalGift ? "text-amber-500" : "text-foreground")}>
                                                    {coupon.discount_value}%<span className="text-lg font-bold text-muted-foreground ml-1">OFF</span>
                                                </span>
                                            ) : (
                                                <span className={cn("text-5xl font-black", isLoyalGift ? "text-amber-500" : "text-foreground")}>
                                                    ₹{coupon.discount_value}<span className="text-lg font-bold text-muted-foreground ml-1">OFF</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "bg-background/80 backdrop-blur-md px-6 py-2 rounded-xl border-2 border-dashed transition-colors group/code flex items-center gap-2 cursor-pointer",
                                            isLoyalGift ? "border-amber-500/30 hover:border-amber-500" : "border-primary/30 hover:border-primary"
                                        )} onClick={() => copyCode(coupon.code)}>
                                            <span className={cn("text-xl font-black uppercase tracking-widest", isLoyalGift ? "text-amber-500" : "text-primary")}>
                                                {coupon.code}
                                            </span>
                                            <Copy className="h-4 w-4 text-muted-foreground group-hover/code:text-primary transition-colors" />
                                        </div>
                                    </div>

                                    {/* Bottom Section: Details & Actions */}
                                    <div className="p-6 pt-8 bg-card/30">
                                        <p className="text-sm font-medium text-center text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                                            {cleanDescription || 'No additional description'}
                                        </p>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Min Order</span>
                                                <span className="font-bold">₹{coupon.min_order_amount}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Max Discount</span>
                                                <span className="font-bold">{coupon.max_discount ? `₹${coupon.max_discount}` : 'No Limit'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Valid Until</span>
                                                <span className={cn("font-bold flex items-center gap-1", isExpired(coupon.valid_until) ? "text-destructive" : "text-foreground")}>
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(coupon.valid_until), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={coupon.is_active ? "outline" : "default"}
                                                className={cn("flex-1 font-bold", coupon.is_active ? (isLoyalGift ? "border-amber-500/20 hover:bg-amber-500/5 text-amber-600" : "border-primary/20 hover:bg-primary/5") : (isLoyalGift ? "bg-amber-500 hover:bg-amber-600" : "bg-primary"))}
                                                onClick={() => handleToggleStatus(coupon)}
                                            >
                                                {coupon.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button size="icon" variant="secondary" className="bg-secondary/50" onClick={() => openEditCoupon(coupon)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCoupon(coupon.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Coupon Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="glass-panel border border-white/10 bg-background/95 backdrop-blur-xl sm:rounded-3xl max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {editingCoupon 
                                ? `Update ${isLoyalMode ? 'Loyal' : 'Normal'} Coupon` 
                                : `Create ${isLoyalMode ? 'Loyal' : 'Normal'} Coupon`}
                        </DialogTitle>
                        <DialogDescription>
                            Configure {isLoyalMode ? 'exclusive VIP' : 'general marketing'} discount rules
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coupon Code *</Label>
                                <Input
                                    id="code"
                                    value={couponForm.code}
                                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SUMMER20"
                                    className="bg-secondary/20 border-border/50 h-11 font-mono uppercase tracking-wider font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discount-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount Type *</Label>
                                <Select
                                    value={couponForm.discount_type}
                                    onValueChange={(value: any) => setCouponForm({ ...couponForm, discount_type: value })}
                                >
                                    <SelectTrigger id="discount-type" className="bg-secondary/20 border-border/50 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">% Percentage</SelectItem>
                                        <SelectItem value="fixed">₹ Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea
                                id="description"
                                value={couponForm.description}
                                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                                placeholder="Describe the offer..."
                                className="bg-secondary/20 border-border/50 min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="discount-value" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Value {couponForm.discount_type === 'percentage' ? '(%)' : '(₹)'} *
                                </Label>
                                <Input
                                    id="discount-value"
                                    type="number"
                                    step="0.01"
                                    value={couponForm.discount_value}
                                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                                    placeholder="20"
                                    className="bg-secondary/20 border-border/50 h-11 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-order" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Order (₹)</Label>
                                <Input
                                    id="min-order"
                                    type="number"
                                    value={couponForm.min_order_amount}
                                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                                    placeholder="0"
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max-discount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Disc. (₹)</Label>
                                <Input
                                    id="max-discount"
                                    type="number"
                                    value={couponForm.max_discount}
                                    onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                                    placeholder="Optional"
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="usage-limit" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usage Limit</Label>
                                <Input
                                    id="usage-limit"
                                    type="number"
                                    value={couponForm.usage_limit}
                                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                                    placeholder="No Limit"
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="valid-from" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valid From</Label>
                                <Input
                                    id="valid-from"
                                    type="date"
                                    value={couponForm.valid_from}
                                    onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="valid-until" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valid Until *</Label>
                                <Input
                                    id="valid-until"
                                    type="date"
                                    value={couponForm.valid_until}
                                    onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCoupon} className={cn(
                            "font-bold shadow-lg px-8",
                            isLoyalMode ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600" : "bg-primary shadow-primary/20 hover:bg-primary/90"
                        )}>
                            {editingCoupon ? 'Save Changes' : `Create ${isLoyalMode ? 'Loyal' : 'Normal'} Coupon`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
