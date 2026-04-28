'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { ArrowLeft, Wallet, QrCode, ShoppingBag, Ticket, X, Percent, User, Phone, MapPin, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { incrementCouponUsage } from '@/actions/coupon'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import { supabase, getRestaurantId } from '@/lib/supabase'
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
        getSGST,
        getCGST,
        getDeliveryCharge,
        getTotal,
        getDiscount,
        coupon,
        setCustomerInfo,
        clearCart,
        applyCoupon,
        removeCoupon,
        markCouponUsed,
        joinExisting,
        setTaxRates
    } = useCartStore()
    const { addNotification } = useNotificationStore()

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi')
    const [loading, setLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false) // Added to prevent empty cart flicker
    const [couponCode, setCouponCode] = useState('')
    const [verifyingCoupon, setVerifyingCoupon] = useState(false)
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

    const [name, setName] = useState(customerName)
    const [phone, setPhone] = useState(customerPhone)
    const [address, setAddress] = useState(deliveryAddress)

    const subtotal = getSubtotal()
    const discount = getDiscount()
    const tax = getTax()
    const sgst = getSGST()
    const cgst = getCGST()
    const delivery = getDeliveryCharge()
    const total = getTotal()

    useEffect(() => {
        if (restaurant) {
            setTaxRates(restaurant.sgst_percentage || 2.5, restaurant.cgst_percentage || 2.5)
        }
    }, [restaurant, setTaxRates])

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
            const rid = getRestaurantId()
            const res = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: trimmedCode,
                    cartTotal: subtotal,
                    restaurantId: rid,
                    customerPhone: phone // Send phone for private coupon verification
                })
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

    const handleReferralLinkage = async (newCustomerId: string, referrerId: string, restaurantId: string) => {
        try {
            console.log('🏆 [Referral] Logging viral conversion:', { newCustomerId, referrerId });

            // 1. Fetch Dynamic Referral Settings
            const { data: settings } = await supabase
                .from('referral_settings')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .maybeSingle();

            const isProgramActive = settings ? settings.is_active : true; // Default true for legacy
            if (settings && !settings.is_active) {
                console.log('🚫 [Referral] Program is currently inactive.');
                return;
            }

            // 2. Log the Referral
            const { data: newCust } = await supabase.from('customers').select('name, phone').eq('id', newCustomerId).single();

            await supabase.from('referral_logs').insert({
                referrer_id: referrerId,
                referred_phone: newCust?.phone || 'Unknown',
                restaurant_id: restaurantId,
                status: 'joined'
            });

            // 3. Reward the Referrer
            const refType = settings?.referrer_reward_type || 'points';
            const refValue = settings?.referrer_reward_value || 500;
            const refItemId = settings?.referrer_reward_item_id;

            if (refType === 'points') {
                console.log(`🎁 [Referral] Referrer will earn ${refValue} points (Pending Claim)!`);
            } else if (refType === 'free_item' && refItemId) {
                const { data: item } = await supabase.from('menu_items').select('name').eq('id', refItemId).single();
                if (item) {
                    const couponCode = `REF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                    await supabase.from('coupons').insert({
                        restaurant_id: restaurantId,
                        code: couponCode,
                        description: `Referral Reward: Free ${item.name}`,
                        discount_type: 'fixed',
                        discount_value: 0,
                        usage_limit: 1,
                        is_active: true,
                        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                }
            } else if (refType === 'fixed' || refType === 'percentage') {
                const couponCode = `DISC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                await supabase.from('coupons').insert({
                    restaurant_id: restaurantId,
                    code: couponCode,
                    description: `Referral Reward: ${refValue}${refType === 'percentage' ? '%' : '₹'} Off`,
                    discount_type: refType,
                    discount_value: Number(refValue),
                    usage_limit: 1,
                    is_active: true,
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
            }

            const fType = settings?.referee_reward_type || 'none';
            const fValue = settings?.referee_reward_value || 0;
            if (fType !== 'none' && newCust) {
                if (fType === 'points') {
                    const { data: currentCust } = await supabase.from('customers').select('loyalty_points').eq('id', newCustomerId).single();
                    await supabase.from('customers').update({ loyalty_points: (currentCust?.loyalty_points || 0) + Number(fValue) }).eq('id', newCustomerId);
                } else {
                    const fCode = `WELCOME-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                    await supabase.from('coupons').insert({
                        restaurant_id: restaurantId,
                        code: fCode,
                        description: `Welcome Gift: ${fType === 'free_item' ? 'Free Item' : fValue + (fType === 'percentage' ? '%' : '₹') + ' Off'}`,
                        discount_type: fType === 'free_item' ? 'fixed' : fType,
                        discount_value: fType === 'free_item' ? 0 : Number(fValue),
                        usage_limit: 1,
                        is_active: true,
                        valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                    });
                }
            }
            sessionStorage.removeItem('referral_source');
        } catch (err) {
            console.error('❌ [Referral] Linkage failed:', err);
        }
    }

    const handlePlaceOrder = async () => {
        if (isNaN(total) || total < 0 || items.length === 0) {
            toast.error('Invalid order. Please add valid items to your cart.')
            return
        }
        if (!name || !phone) {
            toast.error('Please enter name and phone number')
            return
        }

        const rid = getRestaurantId()
        console.log('🚀 [Checkout] Place Order clicked', { name, phone, rid })
        toast.info('Starting order placement...')

        setLoading(true)

        try {
            // ... (previous customer logic remains same) ...
            const cleanPhone = phone.replace(/\D/g, '').slice(-10)
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id, name, phone, address, referred_by')
                .eq('restaurant_id', rid)
                .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
                .maybeSingle()

            let customerId: string
            let referrerId: string | null = null;
            const refCode = sessionStorage.getItem('referral_source');

            if (refCode) {
                const { data: referrer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('restaurant_id', rid)
                    .eq('referral_code', refCode)
                    .maybeSingle();
                if (referrer) referrerId = referrer.id;
            }

            if (existingCustomer) {
                const needsAttribution = !existingCustomer.referred_by && referrerId;
                const { data: updatedCustomer, error: updateError } = await supabase
                    .from('customers')
                    .update({
                        name: name,
                        address: address || null,
                        ...(needsAttribution ? { referred_by: referrerId } : {})
                    })
                    .eq('id', existingCustomer.id)
                    .select('id, name, phone, address, referred_by')
                    .single()

                if (updateError) throw new Error('Failed to update customer: ' + updateError.message)
                if (needsAttribution) await handleReferralLinkage(updatedCustomer.id, referrerId as string, rid);
                customerId = updatedCustomer.id
            } else {
                const { data: newCustomer, error: insertError } = await supabase
                    .from('customers')
                    .insert({
                        phone: phone,
                        name: name,
                        email: null,
                        address: address || null,
                        restaurant_id: rid,
                        referral_code: `RE-${cleanPhone}`,
                        referred_by: referrerId
                    })
                    .select('id, name, phone, address, referral_code, referred_by')
                    .single()

                if (insertError) throw new Error('Failed to create customer: ' + insertError.message)
                if (referrerId) await handleReferralLinkage(newCustomer!.id, referrerId, rid);
                customerId = newCustomer!.id
            }

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
                if (joinExisting !== null) params.append('join', joinExisting.toString())

                const res = await fetch(`/api/orders/active?${params.toString()}&t=${Date.now()}`, {
                    cache: 'no-store'
                })

                if (res.ok) {
                    const { order } = await res.json()
                    if (order) {
                        existingOrderId = order.id
                        existingBillId = order.bill_id
                        existingTotal = order.total
                        existingSubtotal = order.subtotal || 0
                        existingStatus = order.status
                    }
                }
            } catch (err) {
                console.error('❌ [Checkout] Active order check crash:', err)
            }

            let orderId = existingOrderId
            let billId = existingBillId

            if (existingOrderId) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total: existingTotal + total,
                        subtotal: existingSubtotal + subtotal,
                        sgst_amount: sgst,
                        cgst_amount: cgst,
                        status: (existingStatus === 'pending_confirmation' || existingStatus === 'completed' || existingStatus === 'cancelled')
                            ? 'pending_confirmation'
                            : (existingStatus === 'served' ? 'confirmed' : existingStatus),
                        payment_status: 'pending'
                    })
                    .eq('id', existingOrderId)

                if (updateError) throw updateError
            } else {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                billId = `BILL${dateStr}${random}`

                const orderPayload: any = {
                    bill_id: billId,
                    restaurant_id: rid,
                    customer_id: customerId,
                    table_id: resolvedTableId,
                    order_type: orderType || 'dine_in',
                    status: 'pending_confirmation',
                    payment_status: 'pending',
                    payment_method: paymentMethod,
                    subtotal: parseFloat(subtotal.toString()) || 0,
                    sgst_amount: parseFloat(sgst.toString()) || 0,
                    cgst_amount: parseFloat(cgst.toString()) || 0,
                    total: parseFloat(total.toString()) || 0,
                    notes: '',
                    delivery_address: address,
                    created_at: new Date().toISOString()
                }

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert(orderPayload)
                    .select()
                    .single()

                if (orderError) throw new Error(`DB Error [${orderError.code}]: ${orderError.message}`)
                orderId = orderData.id
            }

            const orderItemsData = items.map(item => ({
                order_id: orderId,
                restaurant_id: rid,
                menu_item_id: item.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.discounted_price || item.price,
                subtotal: item.lineTotal,
                notes: item.instructions,
                status: 'pending'
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData)

            if (itemsError) throw itemsError

            // 📡 Prepare Webhook Data for Payment Confirmation Step
            // This ensures webhook runs when user clicks 'Completed Payment' or 'Pay Cash', 
            // NOT when they just click 'Place Order' in Checkout.
            try {
                const webhookData = {
                    bill_id: billId,
                    customer_name: name,
                    customer_phone: phone,
                    total_amount: total,
                    order_type: orderType,
                    table_number: tableNumber,
                    restaurant_id: rid,
                    items: items.map(i => ({ name: i.name, quantity: i.quantity, price:(i.discounted_price || i.price) }))
                };
                sessionStorage.setItem(`webhook_pending_${billId}`, JSON.stringify(webhookData));
                console.log('📡 [Checkout] Webhook data stored for bill:', billId);
            } catch (err) {
                console.error('❌ [Checkout] Failed to store webhook data:', err);
            }

            // Background tasks
            if (coupon && !existingOrderId) {
                incrementCouponUsage(coupon.id).catch(e => console.error('Coupon increment error:', e));
                markCouponUsed(coupon.code);
            }

            // 🚀 6. SUCCESS STATE & REDIRECT
            setIsSuccess(true)
            toast.success('Order placed successfully!')

            addNotification({
                title: existingOrderId ? 'Items Added!' : 'Order Placed!',
                message: existingOrderId ? `Order updated #${billId}.` : `Order placed #${billId}.`,
                type: 'order_status',
                link: `/customer/track/${billId}`
            })


            // Wait a bit for the toast to be readable on mobile
            setTimeout(() => {
                clearCart()
                // Redirect to success page directly for Banquet
                router.push(`/customer/order-confirmed/${billId}`)
            }, 500)

        } catch (err: any) {
            console.error('❌ CRITICAL: Order placement failed!', err)
            toast.error('Failed to place order: ' + (err.message || 'Unknown error'))
        } finally {
            setLoading(false)
        }
    }

    if (items.length === 0 && !isSuccess) {
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

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6 bg-white">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 animate-bounce" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Finalizing Your Order...</h2>
                    <p className="text-slate-500 mt-2">Please wait while we set everything up for you.</p>
                </div>
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FCFBF7] pb-40 font-sans">
            <header className="px-4 py-6 sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-[#D4AF37]/10 -ml-2 text-[#8B6508]">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-[0.3em] text-[#8B6508]">Banquet Checkout</h1>
                <div className="w-8" />
            </header>

            <div className="p-6 space-y-8 max-w-lg mx-auto">
                {/* Contact Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#F4EBD0] flex items-center justify-center border border-[#D4AF37]/20 shadow-sm">
                            <User className="w-5 h-5 text-[#8B6508]" />
                        </div>
                        <h2 className="font-serif font-bold text-xl text-[#1A1A1A]">Guest Details</h2>
                    </div>

                    <div className="bg-white p-2 rounded-2xl shadow-md border border-[#D4AF37]/10 space-y-1">
                        <div className="flex items-center px-4 py-3 border-b border-[#F4EBD0]/50">
                            <User className="w-4 h-4 text-[#D4AF37] mr-3" />
                            <Input
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setCustomerInfo(e.target.value, phone, address) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex items-center px-4 py-3">
                            <Phone className="w-4 h-4 text-[#D4AF37] mr-3" />
                            <Input
                                placeholder="WhatsApp / Phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setCustomerInfo(name, e.target.value, address) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#F4EBD0] flex items-center justify-center border border-[#D4AF37]/20 shadow-sm">
                            <ShoppingBag className="w-5 h-5 text-[#8B6508]" />
                        </div>
                        <h2 className="font-serif font-bold text-xl text-[#1A1A1A]">Menu Selection</h2>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-[#D4AF37]/5 border border-[#D4AF37]/20 overflow-hidden relative">
                        {/* Gold Accent Bar */}
                        <div className="h-2 bg-gradient-to-r from-[#D4AF37] via-[#F4EBD0] to-[#D4AF37]" />

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.cartId} className="flex items-center justify-between py-3 border-b border-dashed border-[#D4AF37]/20 last:border-0 group">
                                        <div className="flex items-center gap-4">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-2xl object-cover border border-[#D4AF37]/20 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-[#FCFBF7] border border-[#D4AF37]/10 flex items-center justify-center shrink-0">
                                                    <ShoppingBag className="w-5 h-5 text-[#D4AF37]/40" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#1A1A1A] group-hover:text-[#8B6508] transition-colors text-sm">
                                                    {item.name}
                                                </span>
                                                {item.instructions && (
                                                    <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.instructions}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pl-3">
                                            <span className="inline-flex items-center justify-center text-[11px] font-black text-[#8B6508] bg-[#F4EBD0] px-2.5 py-1 rounded-full border border-[#D4AF37]/30 shadow-sm whitespace-nowrap">
                                                x {item.quantity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-[#D4AF37]/30" />

                            <div className="py-4 text-center">
                                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-1">Banquet Inclusive</p>
                                <p className="text-xs text-[#8B6508]/60 italic font-serif">All selections are included in your banquet service.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-[#D4AF37]/10 shadow-[0_-10px_40px_rgba(212,175,55,0.1)] z-50">
                <div className="max-w-lg mx-auto">
                    <Button
                        size="lg"
                        className="w-full h-16 rounded-full text-lg font-black shadow-2xl shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all active:scale-[0.98] bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-white border-none"
                        onClick={handlePlaceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Prepping Order...
                            </div>
                        ) : (
                            <div className="flex items-center justify-center w-full px-2">
                                <span className="uppercase tracking-widest">Send to Kitchen</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
