'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { ArrowLeft, Wallet, QrCode, ShoppingBag, Ticket, X, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { triggerPaymentWebhook } from '@/lib/webhook'
import { validateCoupon, incrementCouponUsage, getAvailableCoupons } from '@/actions/coupon'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useNotificationStore } from '@/store/notificationStore'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export default function CheckoutPage() {
    const router = useRouter()
    const {
        items,
        customerName,
        customerPhone,
        deliveryAddress,
        orderType,
        tableNumber,
        getSubtotal,
        getTax,
        getDeliveryCharge,
        getTotal,
        getDiscount,
        coupon,
        setCustomerInfo,
        clearCart,
        applyCoupon,
        removeCoupon
    } = useCartStore()
    const { addNotification } = useNotificationStore()

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi')
    const [loading, setLoading] = useState(false)
    const [couponCode, setCouponCode] = useState('')
    const [verifyingCoupon, setVerifyingCoupon] = useState(false)
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

    const [name, setName] = useState(customerName)
    const [phone, setPhone] = useState(customerPhone)
    const [address, setAddress] = useState(deliveryAddress)

    const subtotal = getSubtotal()
    const discount = getDiscount()
    const tax = getTax()
    const delivery = getDeliveryCharge()
    const total = getTotal()

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return

        setVerifyingCoupon(true)
        const result = await validateCoupon(couponCode, subtotal)
        setVerifyingCoupon(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.coupon) {
            applyCoupon(result.coupon)
            toast.success(`Coupon ${result.coupon.code} applied!`)
            setCouponCode('')
        }
    }

    const handlePlaceOrder = async () => {
        if (isNaN(total) || total <= 0) {
            toast.error('Invalid order amount. Please check your cart.')
            return
        }
        if (!name || !phone) {
            toast.error('Please enter name and phone number')
            return
        }
        if (orderType === 'home_delivery' && !address) {
            toast.error('Please enter delivery address')
            return
        }

        const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (!rid) {
            console.error('❌ CONFIG ERROR: NEXT_PUBLIC_RESTAURANT_ID is missing in .env')
            toast.error('System configuration error. Please contact admin.')
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            // 1. Handle Customer - Manual upsert (check then insert/update)
            console.log('💾 [Step 1/5] Saving customer...', { name, phone, address, rid })

            // First, check if customer exists
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id, name, phone, address')
                .eq('phone', phone)
                .eq('restaurant_id', process.env.NEXT_PUBLIC_RESTAURANT_ID)
                .maybeSingle()

            let customerId: string

            if (existingCustomer) {
                // Update existing customer
                console.log('📝 Updating existing customer:', existingCustomer.id)
                const { data: updatedCustomer, error: updateError } = await supabase
                    .from('customers')
                    .update({
                        name: name,
                        address: address || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingCustomer.id)
                    .select('id, name, phone, address')
                    .single()

                if (updateError) {
                    console.error('❌ Customer update failed:', updateError)
                    throw new Error('Failed to update customer: ' + updateError.message)
                }

                customerId = updatedCustomer.id
                console.log('✅ Customer updated:', updatedCustomer)
            } else {
                // Insert new customer
                console.log('➕ Creating new customer')
                const { data: newCustomer, error: insertError } = await supabase
                    .from('customers')
                    .insert({
                        phone: phone,
                        name: name,
                        email: null,
                        address: address || null,
                        restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID
                    })
                    .select('id, name, phone, address')
                    .single()

                if (insertError) {
                    console.error('❌ Customer insert failed:', insertError)
                    throw new Error('Failed to create customer: ' + insertError.message)
                }

                if (!newCustomer || !newCustomer.id) {
                    throw new Error('Customer ID not returned after insert')
                }

                customerId = newCustomer.id
                console.log('✅ New customer created:', newCustomer)
            }

            console.log('✅ Customer ID confirmed:', customerId, 'Name:', name, 'Phone:', phone)
            toast.success('Customer saved successfully!')


            // 2. Resolve Table ID from Table Number
            let resolvedTableId = null
            if (tableNumber) {
                const { data: tableData } = await supabase
                    .from('restaurant_tables')
                    .select('id')
                    .eq('table_number', parseInt(tableNumber.toString()))
                    .eq('restaurant_id', rid)
                    .maybeSingle()

                if (tableData) resolvedTableId = tableData.id
            }

            // 3. Check for existing active order via Secure API (bypasses RLS)
            let existingOrderId = null
            let existingBillId = null
            let existingTotal = 0
            let existingSubtotal = 0

            try {
                const params = new URLSearchParams()
                params.append('restaurantId', rid)
                if (resolvedTableId) params.append('tableId', resolvedTableId)
                if (tableNumber) params.append('tableNumber', tableNumber.toString())
                if (customerId) params.append('customerId', customerId)

                console.log('🔍 [Step 2.5] Checking active order via API...', params.toString())
                const res = await fetch(`/api/orders/active?${params.toString()}`)

                if (res.ok) {
                    const { order } = await res.json()
                    if (order) {
                        console.log('✅ Found active order via API:', order)
                        existingOrderId = order.id
                        existingBillId = order.bill_id
                        existingTotal = order.total
                        existingSubtotal = order.subtotal || 0
                        // Note: If adding to existing order, we generally don't apply new coupons to old total easily
                        // For simplicity, we might just add items and add cost.
                        // Ideally, we should recalculate the whole order with the coupon if applicable, 
                        // but technically partial payments make this hard.
                        // We will just add the current cart total (discounted) to the existing order total.
                    } else {
                        console.log('🆕 No active order found via API. Creating new one.')
                    }
                } else {
                    console.warn('⚠️ API check failed, status:', res.status)
                }
            } catch (err) {
                console.error('❌ Error checking active order via API:', err)
                // Fallback: Proceed as new order
            }

            let orderId = existingOrderId
            let billId = existingBillId

            if (existingOrderId) {
                // Append to existing order
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total: existingTotal + total,
                        subtotal: existingSubtotal + subtotal,
                        tax: ((existingSubtotal + subtotal - discount) * 0.05), // Recalculate tax roughly
                        // Note: Discount logic on existing orders is complex. 
                        // We apply discount only to the current chunk effectively by adding `total` (which is already discounted).
                        // However, we might need to store the discount value.
                        // Let's increment discount if any.
                        discount: (discount || 0), // This might need to check existing discount, but schema doesn't seem to fetch it above easily.
                        status: 'pending', // Move back to pending for kitchen to see new items
                        payment_status: 'pending',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingOrderId)

                if (updateError) throw updateError
                toast.success('Items added to your existing order!', {
                    description: `Bill ID: ${billId}`
                })
            } else {
                // Create new order
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                billId = `BILL${dateStr}${random}`

                const orderPayload: any = {
                    bill_id: billId,
                    restaurant_id: rid,
                    customer_id: customerId,
                    table_id: resolvedTableId,
                    order_type: orderType || 'dine_in',
                    status: 'pending',
                    payment_status: 'pending',
                    payment_method: paymentMethod,
                    subtotal: parseFloat(subtotal.toString()) || 0,
                    tax: parseFloat(tax.toString()) || 0,
                    discount: parseFloat(discount.toString()) || 0,
                    delivery_charge: parseFloat(delivery.toString()) || 0,
                    total: parseFloat(total.toString()) || 0,
                    special_instructions: '',
                    delivery_address: address,
                    estimated_time: 30,
                    created_at: new Date().toISOString()
                }

                console.log('📤 [Step 3/5] Inserting order to Supabase...', orderPayload)

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert(orderPayload)
                    .select()
                    .single()

                if (orderError) {
                    console.error('❌ Order insertion failed!')
                    throw new Error(`DB Error [${orderError.code}]: ${orderError.message}`)
                }

                console.log('✅ Order created successfully:', orderData)
                orderId = orderData.id
                toast.success('Order placed successfully!', {
                    description: `Bill ID: ${billId}`
                })
            }

            // 4. Add order items
            const orderItemsData = items.map(item => ({
                order_id: orderId,
                menu_item_id: item.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.discounted_price || item.price,
                total: item.lineTotal,
                special_instructions: item.instructions
            }))
            console.log('📦 [Step 4/5] Adding order items...', orderItemsData)

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData)

            if (itemsError) throw itemsError

            // Update Coupon Usage if used
            if (coupon && !existingOrderId) {
                await incrementCouponUsage(coupon.id)
            }

            clearCart()

            // 3.5 Update Stock Logic
            try {
                for (const item of items) {
                    // Fetch current stock
                    const { data: menuItem } = await supabase
                        .from('menu_items')
                        .select('stock, is_available, is_infinite_stock')
                        .eq('id', item.id)
                        .single()

                    if (menuItem && !menuItem.is_infinite_stock && typeof menuItem.stock === 'number') {
                        const newStock = Math.max(0, menuItem.stock - item.quantity)
                        const shouldDisable = newStock <= 0

                        await supabase
                            .from('menu_items')
                            .update({
                                stock: newStock,
                                is_available: shouldDisable ? false : menuItem.is_available
                            })
                            .eq('id', item.id)

                        if (shouldDisable) {
                            console.log(`Item ${item.name} is now out of stock`)
                        }
                    }
                }
            } catch (stockErr) {
                console.error('Failed to update stock:', stockErr)
            }

            // Trigger n8n Webhook
            await triggerPaymentWebhook({
                bill_id: billId,
                amount: total,
                customer: {
                    name: name,
                    phone: phone,
                    address: address
                },
                order_type: orderType,
                table_number: tableNumber,
                items: items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.discounted_price || i.price,
                    total: i.lineTotal
                })),
                payment_method: paymentMethod,
                restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID,
                created_at: new Date().toISOString(),
                source: 'customer_app',
                trigger_type: 'new_order_placed'
            })

            addNotification({
                title: existingOrderId ? 'Items Added!' : 'Order Placed!',
                message: existingOrderId
                    ? `Additional items added to your order #${billId}.`
                    : `Your order #${billId} has been successfully placed.`,
                type: 'order_status',
                link: `/customer/track/${billId}`
            })

            if (paymentMethod === 'upi') {
                router.push(`/customer/payment/upi?billId=${billId}&amount=${total}`)
            } else {
                router.push(`/customer/order-confirmed/${billId}`)
            }

        } catch (err: any) {
            console.error('❌ CRITICAL: Order placement failed!')
            console.error('Error object:', err)
            const errorMessage = err.message || err.details || (typeof err === 'object' ? JSON.stringify(err) : String(err))

            toast.error('Failed to place order: ' + errorMessage, {
                duration: 10000
            })
        } finally {
            setLoading(false)
        }
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center animate-pulse">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Your cart is empty</h2>
                <p className="text-muted-foreground max-w-xs mx-auto">Looks like you haven't added anything to your cart yet.</p>
                <Button onClick={() => router.push('/customer/menu')} className="h-12 px-8 rounded-full text-lg font-bold shadow-lg shadow-primary/25">
                    Browse Menu
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32">
            <div className="pt-4 px-4 pb-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Menu
                </Button>
                <h1 className="text-2xl font-black mt-2">Checkout</h1>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500 fade-in">
                {/* Customer Details */}
                <Card className="border-0 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-100/50 pb-4">
                        <CardTitle className="text-lg font-bold text-orange-950">Contact Details</CardTitle>
                        <CardDescription>Where should we send updates?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Name</label>
                            <Input
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setCustomerInfo(e.target.value, phone, address) }}
                                className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-white focus:border-primary/20 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Phone</label>
                            <Input
                                placeholder="7282871506"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setCustomerInfo(name, e.target.value, address) }}
                                className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-white focus:border-primary/20 transition-all font-medium"
                            />
                        </div>
                        {orderType === 'home_delivery' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Delivery Address</label>
                                <textarea
                                    placeholder="Block A, Street 5..."
                                    className="flex w-full rounded-xl border border-transparent bg-secondary/30 px-3 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-medium focus:bg-white focus:border-primary/20 transition-all resize-none"
                                    value={address}
                                    onChange={(e) => { setAddress(e.target.value); setCustomerInfo(name, phone, e.target.value) }}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed">
                            <span className="text-sm text-muted-foreground">Order Type:</span>
                            <Badge variant="secondary" className="font-bold uppercase tracking-wider text-[10px]">
                                {orderType === 'dine_in' ? `Dine In (Table ${tableNumber || '?'})` : orderType?.replace('_', ' ')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Combine Order Summary & Coupon in one flow */}
                <Card className="border-0 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100/50 pb-4">
                        <CardTitle className="text-lg font-bold text-blue-950">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.cartId} className="flex justify-between text-sm py-1 group">
                                    <span className="font-medium group-hover:text-primary transition-colors">
                                        {item.quantity} x {item.name}
                                    </span>
                                    <span className="font-bold">₹{item.lineTotal.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed my-4" />

                        {/* Coupon Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2">
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Promo Code</span>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="link" className="text-primary h-auto p-0 font-bold text-xs" onClick={async () => {
                                            const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
                                            if (rid) {
                                                const deals = await getAvailableCoupons(rid)
                                                // We can store this in local state to render
                                                // However, sheet content is rendered immediately, so we need state
                                                setAvailableCoupons(deals)
                                            }
                                        }}>
                                            View Offers
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl pt-6 px-0 overflow-hidden flex flex-col">
                                        <SheetHeader className="px-6 pb-4 border-b">
                                            <SheetTitle className="text-left text-xl">Available Offers</SheetTitle>
                                            <SheetDescription className="text-left">
                                                Select a promo code to apply to your order
                                            </SheetDescription>
                                        </SheetHeader>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                                            {availableCoupons.length === 0 ? (
                                                <div className="text-center py-10 text-muted-foreground">
                                                    <Ticket className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                    <p>No active offers available right now.</p>
                                                </div>
                                            ) : (
                                                availableCoupons.map((deal) => (
                                                    <div
                                                        key={deal.id}
                                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all"
                                                        onClick={() => {
                                                            setCouponCode(deal.code)
                                                            // Auto apply logic
                                                            // We can just call handleApplyCoupon but we need state update first
                                                            // Or better, directly call validate logic
                                                            validateCoupon(deal.code, subtotal).then(res => {
                                                                if (res.coupon) {
                                                                    applyCoupon(res.coupon)
                                                                    toast.success(`Applied ${deal.code}!`)
                                                                    // Close sheet? We need a ref or controlled open state for sheet
                                                                    // For now, user can close manually or see success toast
                                                                } else if (res.error) {
                                                                    toast.error(res.error)
                                                                }
                                                            })
                                                        }}
                                                    >
                                                        {/* Dashed line */}
                                                        <div className="absolute left-0 top-1/2 -mt-3 -ml-1.5 w-3 h-3 rounded-full bg-slate-50 z-10" />
                                                        <div className="absolute right-0 top-1/2 -mt-3 -mr-1.5 w-3 h-3 rounded-full bg-slate-50 z-10" />
                                                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-slate-100" />

                                                        <div className="flex gap-4 relative z-0">
                                                            <div className="flex flex-col items-center justify-center w-20 border-r border-dashed border-slate-200 pr-4">
                                                                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mb-1">
                                                                    <Percent className="h-5 w-5 text-orange-600" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                    {deal.discount_type === 'percentage' ? `${deal.discount_value}%` : `₹${deal.discount_value}`}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 py-1">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="font-black text-lg text-slate-800 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                                                        {deal.code}
                                                                    </span>
                                                                    {deal.max_discount && (
                                                                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-100">
                                                                            Max ₹{deal.max_discount}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-2">
                                                                    {deal.description || 'Special discount for you!'}
                                                                </p>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <p className="text-[10px] text-slate-400 font-semibold bg-slate-50 inline-block px-1.5 py-0.5 rounded">
                                                                        Valid until {format(new Date(deal.valid_until), 'MMM dd')}
                                                                    </p>
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-0">
                                                                        APPLY
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {coupon ? (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center border border-green-200 shadow-sm">
                                            <Ticket className="h-5 w-5 text-green-700" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-green-900 flex items-center gap-2">
                                                {coupon.code}
                                                <Badge variant="outline" className="bg-green-100/50 text-green-700 border-green-200 text-[10px] h-5">APPLIED</Badge>
                                            </p>
                                            <p className="text-xs text-green-700 font-medium mt-0.5">
                                                You saved ₹{discount.toFixed(2)} with this offer!
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter coupon code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="h-11 text-sm bg-secondary/30 border-transparent focus:bg-white focus:border-primary/20 font-mono uppercase placeholder:normal-case transition-all"
                                    />
                                    <Button
                                        variant="default" // Changed to default for better visibility
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode || verifyingCoupon}
                                        className="gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                                    >
                                        {verifyingCoupon ? (
                                            <div className="h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            "APPLY"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-dashed my-4" />

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                            </div>

                            {discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span className="font-medium flex items-center gap-1"><Ticket className="h-3 w-3" /> Discount</span>
                                    <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax (5%)</span>
                                <span className="font-medium">₹{tax.toFixed(2)}</span>
                            </div>
                            {orderType === 'home_delivery' && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Delivery Fee</span>
                                    <span className="font-medium">₹{delivery.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-primary/5 -mx-6 -mb-6 p-6 mt-4 border-t border-primary/10">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-black text-2xl text-primary">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <Card className="border-0 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-bold">Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod('upi')}
                            className={`relative h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${paymentMethod === 'upi'
                                ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                : 'bg-white border-muted hover:border-primary/50 hover:bg-secondary/50'
                                }`}
                        >
                            <QrCode className={`w-8 h-8 ${paymentMethod === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`font-bold text-sm ${paymentMethod === 'upi' ? 'text-primary' : 'text-muted-foreground'}`}>UPI / Online</span>
                            {paymentMethod === 'upi' && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                            )}
                        </button>
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={`relative h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${paymentMethod === 'cash'
                                ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                : 'bg-white border-muted hover:border-primary/50 hover:bg-secondary/50'
                                }`}
                        >
                            <Wallet className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`font-bold text-sm ${paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`}>Cash</span>
                            {paymentMethod === 'cash' && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                            )}
                        </button>
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
                <div className="max-w-lg mx-auto">
                    <Button
                        size="lg"
                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-[0.98] bg-gradient-to-r from-orange-500 to-orange-600"
                        onClick={handlePlaceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full px-2">
                                <span>Place Order</span>
                                <span className="bg-black/20 px-3 py-1 rounded-lg text-base">₹{total.toFixed(2)}</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
