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
import { Plus, Percent, DollarSign, Calendar, TrendingUp, Edit, Trash2, Copy } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Coupon } from '@/types'
import { toast } from 'sonner'
import { format } from 'date-fns'

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

    useEffect(() => {
        fetchCoupons()

        // Realtime subscription
        const channel = supabase
            .channel('coupons-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `restaurant_id=eq.${RESTAURANT_ID}` }, () => {
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
        } catch (error) {
            console.error('Error fetching coupons:', error)
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

            const couponData = {
                restaurant_id: RESTAURANT_ID,
                code: couponForm.code.toUpperCase(),
                description: couponForm.description,
                discount_type: couponForm.discount_type,
                discount_value: parseFloat(couponForm.discount_value),
                min_order_amount: parseFloat(couponForm.min_order_amount) || 0,
                max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
                usage_limit: parseInt(couponForm.usage_limit) || 0,
                valid_from: couponForm.valid_from || new Date().toISOString(),
                valid_until: new Date(couponForm.valid_until).toISOString(),
                is_active: true,
                used_count: 0,
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
                toast.success('Coupon created successfully')
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
                <div className="text-muted-foreground">Loading coupons...</div>
            </div>
        )
    }

    const activeCoupons = coupons.filter(c => c.is_active && !isExpired(c.valid_until))
    const totalUsage = coupons.reduce((sum, c) => sum + c.used_count, 0)

    return (
        <div className="space-y-6">
            <PageHeader
                title="Coupons"
                description="Manage discount coupons"
            >
                <Button onClick={() => {
                    resetForm()
                    setDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Coupon
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Percent className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Coupons</p>
                                <p className="text-2xl font-bold">{coupons.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Coupons</p>
                                <p className="text-2xl font-bold">{activeCoupons.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Usage</p>
                                <p className="text-2xl font-bold">{totalUsage}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Coupons List */}
            <div className="space-y-3">
                {coupons.length === 0 ? (
                    <Card className="bg-card border-2">
                        <CardContent className="flex h-32 items-center justify-center">
                            <p className="text-muted-foreground">No coupons yet. Create your first coupon!</p>
                        </CardContent>
                    </Card>
                ) : (
                    coupons.map((coupon) => (
                        <Card
                            key={coupon.id}
                            className={`bg-card border-2 border-muted hover:border-primary/40 transition-all shadow-sm ${!coupon.is_active || isExpired(coupon.valid_until) ? 'opacity-60 grayscale-[0.5]' : ''
                                }`}
                        >
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    {/* Coupon Info */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-2 bg-primary/10 rounded-lg border-2 border-dashed border-primary">
                                                <p className="text-xl font-bold text-primary tracking-wider">
                                                    {coupon.code}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyCode(coupon.code)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            {coupon.is_active && !isExpired(coupon.valid_until) ? (
                                                <Badge variant="default">Active</Badge>
                                            ) : isExpired(coupon.valid_until) ? (
                                                <Badge variant="destructive">Expired</Badge>
                                            ) : (
                                                <Badge variant="outline">Inactive</Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">
                                            {coupon.description || 'No description'}
                                        </p>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <span className="flex items-center gap-1">
                                                {coupon.discount_type === 'percentage' ? (
                                                    <>
                                                        <Percent className="h-3 w-3" />
                                                        {coupon.discount_value}% OFF
                                                    </>
                                                ) : (
                                                    <>
                                                        <DollarSign className="h-3 w-3" />
                                                        ₹{coupon.discount_value} OFF
                                                    </>
                                                )}
                                            </span>
                                            <span>•</span>
                                            <span>Min Order: ₹{coupon.min_order_amount}</span>
                                            {coupon.max_discount && (
                                                <>
                                                    <span>•</span>
                                                    <span>Max: ₹{coupon.max_discount}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Valid till {format(new Date(coupon.valid_until), 'dd MMM yyyy')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-primary">
                                                {coupon.used_count}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                / {coupon.usage_limit || '∞'} uses
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleToggleStatus(coupon)}
                                            >
                                                {coupon.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditCoupon(coupon)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Coupon Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl bg-card">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCoupon ? 'Update coupon details' : 'Create a new discount coupon'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="code">Coupon Code *</Label>
                                <Input
                                    id="code"
                                    value={couponForm.code}
                                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                                    placeholder="SAVE20"
                                />
                            </div>
                            <div>
                                <Label htmlFor="discount-type">Discount Type *</Label>
                                <Select
                                    value={couponForm.discount_type}
                                    onValueChange={(value: any) => setCouponForm({ ...couponForm, discount_type: value })}
                                >
                                    <SelectTrigger id="discount-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={couponForm.description}
                                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                                placeholder="Brief description of this coupon"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="discount-value">
                                    Discount {couponForm.discount_type === 'percentage' ? '(%)' : '(₹)'} *
                                </Label>
                                <Input
                                    id="discount-value"
                                    type="number"
                                    step="0.01"
                                    value={couponForm.discount_value}
                                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                                    placeholder="20"
                                />
                            </div>
                            <div>
                                <Label htmlFor="min-order">Min Order (₹)</Label>
                                <Input
                                    id="min-order"
                                    type="number"
                                    value={couponForm.min_order_amount}
                                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                                    placeholder="500"
                                />
                            </div>
                            <div>
                                <Label htmlFor="max-discount">Max Discount (₹)</Label>
                                <Input
                                    id="max-discount"
                                    type="number"
                                    value={couponForm.max_discount}
                                    onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                                    placeholder="100"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="usage-limit">Usage Limit</Label>
                                <Input
                                    id="usage-limit"
                                    type="number"
                                    value={couponForm.usage_limit}
                                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                                    placeholder="100"
                                />
                            </div>
                            <div>
                                <Label htmlFor="valid-from">Valid From</Label>
                                <Input
                                    id="valid-from"
                                    type="date"
                                    value={couponForm.valid_from}
                                    onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="valid-until">Valid Until *</Label>
                                <Input
                                    id="valid-until"
                                    type="date"
                                    value={couponForm.valid_until}
                                    onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCoupon}>
                            {editingCoupon ? 'Update' : 'Create'} Coupon
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
