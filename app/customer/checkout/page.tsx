'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { ArrowLeft, Wallet, QrCode, ShoppingBag, Ticket, X, Percent, User, Phone, MapPin, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { triggerAutomationWebhook } from '@/lib/webhook'
import { incrementCouponUsage } from '@/actions/coupon'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useNotificationStore } from '@/store/notificationStore'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { UpsellList } from '@/components/customer/menu/UpsellList'
import { useRestaurant } from '@/hooks/useRestaurant'

export default function CheckoutPage() {
    const { restaurant } = useRestaurant()
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
        removeCoupon,
        markCouponUsed,
        joinExisting
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
        const trimmedCode = couponCode.trim().toUpperCase()
        if (!trimmedCode) return

        // 1. Check if ANY coupon is already applied
        if (coupon) {
            if (coupon.code === trimmedCode) {
                toast.error('This coupon is already applied!')
            } else {
                toast.error('A coupon is already applied. Remove it first to apply another.')
            }
            return
        }

        // 2. Check if already used in past orders (persistent check)
        if (useCartStore.getState().isCouponUsed(trimmedCode)) {
            toast.error('You have already used this coupon code!')
            setCouponCode('')
            return
        }

        setVerifyingCoupon(true)
        try {
            const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID || ''
            const res = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: trimmedCode, cartTotal: subtotal, restaurantId: rid })
            })
            const result = await res.json()
            console.log('🎟️ [Checkout] Validate result:', result)

            if (result.error) {
                toast.error(result.error)
            } else if (result.coupon) {
                applyCoupon(result.coupon)
                toast.success(`🎉 Coupon ${result.coupon.code} applied! You save ₹${(
                    result.coupon.discount_type === 'percentage'
                        ? (subtotal * result.coupon.discount_value / 100)
                        : result.coupon.discount_value
                ).toFixed(2)}`)
                setCouponCode('')
            } else {
                toast.error('Invalid coupon code')
            }
        } catch (err) {
            console.error('❌ [Checkout] Coupon validate error:', err)
            toast.error('Failed to validate coupon. Please try again.')
        } finally {
            setVerifyingCoupon(false)
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

        const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'f1dde894-c027-4506-a55a-dfe65bb0449f'
        console.log('🚀 [Checkout] Place Order clicked', { name, phone, rid })
        toast.info('Starting order placement...')

        setLoading(true)

        try {
            // 1. Handle Customer - Manual upsert (check then insert/update)
            console.log('💾 [Step 1/5] Saving customer...', { name, phone, address, rid })

            // First, check if customer exists
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id, name, phone, address')
                .eq('phone', phone)
                .eq('restaurant_id', rid)
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
                        restaurant_id: rid
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
            let existingStatus = 'pending'

            try {
                const params = new URLSearchParams()
                params.append('restaurantId', rid)
                if (resolvedTableId) params.append('tableId', resolvedTableId)
                if (tableNumber) params.append('tableNumber', tableNumber.toString())
                if (customerId) params.append('customerId', customerId)
                
                // Add the join intent
                if (joinExisting !== null) {
                    params.append('join', joinExisting.toString())
                }

                console.log('🔍 [Step 2.5] Checking active order via API...', params.toString())
                const res = await fetch(`/api/orders/active?${params.toString()}`)

                if (res.ok) {
                    const { order } = await res.json()
                    // Merge into ANY unpaid order (except cancelled)
                    // This includes served orders - customer can keep ordering on same bill
                    if (order && order.payment_status !== 'paid' && order.status !== 'cancelled') {
                        console.log('✅ Found active (unpaid) order via API:', order)
                        existingOrderId = order.id
                        existingBillId = order.bill_id
                        existingTotal = order.total
                        existingSubtotal = order.subtotal || 0
                        existingStatus = order.status  // Store existing status
                    } else {
                        console.log('🆕 No unpaid order found. Creating new bill.')
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
                        // Status logic: Move served/completed orders back to pending for new items
                        // Keep preparing/ready orders in same status (kitchen is actively working)
                        status: (existingStatus === 'served' || existingStatus === 'completed')
                            ? 'pending'  // New items added to completed order - restart kitchen flow
                            : (existingStatus === 'pending' || existingStatus === 'confirmed')
                                ? 'pending'  // Keep pending
                                : existingStatus,  // Keep preparing/ready as-is
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
                special_instructions: item.instructions,
                status: 'pending'  // Explicitly set status to pending - kitchen staff will manually mark as ready
            }))
            console.log('📦 [Step 4/5] Adding order items...', orderItemsData)

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData)

            if (itemsError) throw itemsError

            // 5. Prepare Webhook Data
            const webhookData = {
                bill_id: billId,
                amount: total,
                customer: {
                    name: name,
                    phone: phone,
                    address: address
                },
                order_type: orderType || 'dine_in',
                table_number: tableNumber || 0,
                items: items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.discounted_price || i.price,
                    total: i.lineTotal
                })),
                payment_method: paymentMethod,
                restaurant_id: rid,
            }

            // 5. Background Tasks (Non-blocking)
            // We fire these and don't block the UI for the customer since their order is already in DB.
            const backgroundTasks = async () => {
                try {
                    // Trigger n8n Webhook
                    console.log('📡 [Checkout] Sending Webhook (Background):', webhookData)
                    triggerAutomationWebhook('new-order', webhookData).catch(e => console.error('Webhook BG error:', e));

                    // Update Coupon Usage if used
                    if (coupon && !existingOrderId) {
                        incrementCouponUsage(coupon.id).catch(e => console.error('Coupon increment error:', e));
                        markCouponUsed(coupon.code);
                    }

                    // Update Stock Logic in Parallel
                    await Promise.all(items.map(async (item) => {
                        try {
                            const { data: menuItem } = await supabase
                                .from('menu_items')
                                .select('stock, is_available, is_infinite_stock')
                                .eq('id', item.id)
                                .single();

                            if (menuItem && !menuItem.is_infinite_stock && typeof menuItem.stock === 'number') {
                                const newStock = Math.max(0, menuItem.stock - item.quantity);
                                const shouldDisable = newStock <= 0;

                                await supabase
                                    .from('menu_items')
                                    .update({
                                        stock: newStock,
                                        is_available: shouldDisable ? false : menuItem.is_available
                                    })
                                    .eq('id', item.id);
                            }
                        } catch (itemErr) {
                            console.error(`Stock update failed for ${item.name}:`, itemErr);
                        }
                    }));
                } catch (bgErr) {
                    console.error('❌ Background tasks failed:', bgErr);
                }
            };

            // Start background tasks
            backgroundTasks();

            // 6. Finalize UI Flow (Fast Redirect)
            clearCart()

            addNotification({
                title: existingOrderId ? 'Items Added!' : 'Order Placed!',
                message: existingOrderId
                    ? `Additional items added to your order #${billId}.`
                    : `Your order #${billId} has been successfully placed.`,
                type: 'order_status',
                link: `/customer/track/${billId}`
            })

            // Navigate immediately
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
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6 bg-slate-50">
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                    <ShoppingBag className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Looks like you haven't added any delicious items yet.</p>
                </div>
                <Button onClick={() => router.push('/customer/menu')} className="h-14 px-10 rounded-full text-lg font-bold shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 transition-all active:scale-95">
                    Start Ordering
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-40 font-sans">
            <header className="px-4 py-4 sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-black/5 -ml-2 text-slate-600">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Checkout</h1>
                <div className="w-8" /> {/* Spacer */}
            </header>

            <div className="p-6 space-y-8 max-w-lg mx-auto">
                {/* Contact Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">Contact Details</h2>
                    </div>

                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                        <div className="flex items-center px-4 py-2 border-b border-slate-50">
                            <User className="w-4 h-4 text-slate-400 mr-3" />
                            <Input
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setCustomerInfo(e.target.value, phone, address) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex items-center px-4 py-2">
                            <Phone className="w-4 h-4 text-slate-400 mr-3" />
                            <Input
                                placeholder="Phone Number"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setCustomerInfo(name, e.target.value, address) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                        {orderType === 'home_delivery' && (
                            <div className="flex items-start px-4 py-3 border-t border-slate-50">
                                <MapPin className="w-4 h-4 text-slate-400 mr-3 mt-1" />
                                <textarea
                                    placeholder="Delivery Address"
                                    value={address}
                                    onChange={(e) => { setAddress(e.target.value); setCustomerInfo(name, phone, e.target.value) }}
                                    className="flex-1 min-h-[80px] text-sm resize-none outline-none placeholder:text-slate-300 font-medium bg-transparent"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-green-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">Payment Method</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod('upi')}
                            className={cn(
                                "relative h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 overflow-hidden group",
                                paymentMethod === 'upi' ? "bg-orange-50 border-orange-500 shadow-xl shadow-orange-500/10" : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-colors mb-1",
                                paymentMethod === 'upi' ? "bg-white text-orange-600 shadow-sm" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                            )}>
                                <QrCode className="w-6 h-6" />
                            </div>
                            <span className={cn("font-bold text-sm", paymentMethod === 'upi' ? "text-orange-900" : "text-slate-500")}>UPI / Online</span>
                            {paymentMethod === 'upi' && (
                                <div className="absolute top-3 right-3 text-orange-500">
                                    <CheckCircle2 className="w-5 h-5 fill-orange-500 text-white" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={cn(
                                "relative h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 overflow-hidden group",
                                paymentMethod === 'cash' ? "bg-orange-50 border-orange-500 shadow-xl shadow-orange-500/10" : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-colors mb-1",
                                paymentMethod === 'cash' ? "bg-white text-orange-600 shadow-sm" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                            )}>
                                <Wallet className="w-6 h-6" />
                            </div>
                            <span className={cn("font-bold text-sm", paymentMethod === 'cash' ? "text-orange-900" : "text-slate-500")}>Pay Cash</span>
                            {paymentMethod === 'cash' && (
                                <div className="absolute top-3 right-3 text-orange-500">
                                    <CheckCircle2 className="w-5 h-5 fill-orange-500 text-white" />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">Order Summary</h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-slate-100 overflow-hidden relative">
                        {/* Receipt Top Pattern */}
                        <div className="h-2 bg-gradient-to-r from-orange-400 via-red-400 to-purple-400" />

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.cartId} className="flex justify-between text-sm group">
                                        <span className="font-medium text-slate-600 group-hover:text-slate-900 transition-colors flex gap-2">
                                            <span className="text-slate-400 font-bold">{item.quantity}x</span>
                                            {item.name}
                                        </span>
                                        <span className="font-bold text-slate-900">₹{item.lineTotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-slate-200" />

                            {/* Coupon Input */}
                            <div className="space-y-3">
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
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Enter promo code"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                className="h-12 pl-10 text-sm bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/20 font-mono uppercase placeholder:normal-case transition-all rounded-xl placeholder:font-sans"
                                            />
                                            <Ticket className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        </div>
                                        <Button
                                            variant="default"
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || verifyingCoupon}
                                            className="h-12 px-6 font-bold bg-slate-900 hover:bg-black rounded-xl"
                                        >
                                            {verifyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLY"}
                                        </Button>
                                    </div>
                                )}

                                {!coupon && (
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="link" className="text-orange-600 h-auto p-0 font-bold text-xs flex items-center gap-1 hover:no-underline" onClick={async () => {
                                                const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
                                                console.log('🎟️ [Checkout] Fetching available coupons for rid:', rid)
                                                try {
                                                    const res = await fetch(`/api/coupons?restaurantId=${rid || ''}`)
                                                    const json = await res.json()
                                                    console.log('✅ [Checkout] Coupons API response:', json)
                                                    if (json.error) {
                                                        console.error('❌ [Checkout] Coupons API error:', json.error)
                                                    }
                                                    setAvailableCoupons(json.coupons || [])
                                                } catch (err) {
                                                    console.error('❌ [Checkout] Failed to fetch coupons:', err)
                                                }
                                            }}>
                                                View Available Offers <ChevronRight className="w-3 h-3" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl pt-6 px-0 overflow-hidden flex flex-col">
                                            <SheetHeader className="px-6 pb-4 border-b border-slate-100">
                                                <SheetTitle className="text-left text-xl font-black">Available Offers</SheetTitle>
                                                <SheetDescription className="text-left">
                                                    Select a promo code to apply to your order
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                                                {availableCoupons.length === 0 ? (
                                                    <div className="text-center py-10 text-muted-foreground">
                                                        <Ticket className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                        <p>No active offers available right now.</p>
                                                    </div>
                                                ) : (
                                                    availableCoupons
                                                        .map((deal) => {
                                                            const alreadyUsed = useCartStore.getState().isCouponUsed(deal.code)
                                                            return (
                                                                <div
                                                                    key={deal.id}
                                                                    className={`bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden transition-all ${alreadyUsed
                                                                        ? 'border-slate-100 opacity-50 cursor-not-allowed'
                                                                        : 'border-slate-200 group active:scale-[0.98] cursor-pointer hover:border-orange-200'
                                                                        }`}
                                                                    onClick={async () => {
                                                                        if (alreadyUsed) {
                                                                            toast.error('You have already used this coupon!')
                                                                            return
                                                                        }

                                                                        const currentCoupon = useCartStore.getState().coupon
                                                                        if (currentCoupon) {
                                                                            if (currentCoupon.code === deal.code) {
                                                                                toast.error('This coupon is already applied!')
                                                                            } else {
                                                                                toast.error('A coupon is already applied. Remove it first.')
                                                                            }
                                                                            return
                                                                        }

                                                                        const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID || ''
                                                                        try {
                                                                            const res = await fetch('/api/coupons', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ code: deal.code, cartTotal: subtotal, restaurantId: rid })
                                                                            })
                                                                            const result = await res.json()
                                                                            if (result.coupon) {
                                                                                applyCoupon(result.coupon)
                                                                                toast.success(`🎉 Applied ${deal.code}!`)
                                                                            } else if (result.error) {
                                                                                toast.error(result.error)
                                                                            }
                                                                        } catch {
                                                                            toast.error('Could not apply coupon. Try again.')
                                                                        }
                                                                    }}
                                                                >
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
                                                                                {alreadyUsed && (
                                                                                    <span className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">USED</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-2">
                                                                                {deal.description || 'Special discount for you!'}
                                                                            </p>
                                                                            <div className="flex items-center justify-between mt-2">
                                                                                <p className="text-[10px] text-slate-400 font-semibold bg-slate-50 inline-block px-1.5 py-0.5 rounded">
                                                                                    Valid until {format(new Date(deal.valid_until), 'MMM dd')}
                                                                                </p>
                                                                                {!alreadyUsed && (
                                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-0">
                                                                                        TAP TO APPLY
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                )}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                )}
                            </div>

                            {restaurant?.id && (
                                <div className="pt-2 border-t border-dashed border-slate-200">
                                    <UpsellList
                                        restaurantId={restaurant.id}
                                        limit={3}
                                        title="Missed Something?"
                                    />
                                </div>
                            )}

                            <div className="space-y-2 text-sm pt-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-900">₹{subtotal.toFixed(2)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span className="font-medium flex items-center gap-1"><Ticket className="h-3 w-3" /> Discount</span>
                                        <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax (5%)</span>
                                    <span className="font-medium text-slate-900">₹{tax.toFixed(2)}</span>
                                </div>
                                {orderType === 'home_delivery' && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Delivery Fee</span>
                                        <span className="font-medium text-slate-900">₹{delivery.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Total to Pay</span>
                            <span className="font-black text-2xl text-slate-900">₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-lg mx-auto">
                    <Button
                        size="lg"
                        className="w-full h-16 rounded-[2rem] text-lg font-black shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 transition-all active:scale-[0.98] bg-gradient-to-r from-orange-500 to-red-500 text-white"
                        onClick={handlePlaceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing Order...
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full px-2">
                                <span>Place Order</span>
                                <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-base font-bold shadow-sm">
                                    ₹{total.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
