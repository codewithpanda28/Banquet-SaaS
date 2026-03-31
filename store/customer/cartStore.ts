import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, MenuItem, OrderType, Coupon } from '@/types'

interface CartState {
    items: CartItem[]
    orderType: OrderType | null
    tableNumber: number | null
    tableId: string | null
    sessionToken: string | null
    specialInstructions: string
    customerName: string
    customerPhone: string
    deliveryAddress: string
    coupon: Coupon | null
    usedCoupons: string[]  // Track coupon codes already used by this customer
    joinExisting: boolean | null // null = undecided, true = join group, false = separate
    sgst_rate: number
    cgst_rate: number

    addItem: (item: MenuItem, quantity: number, instructions: string) => void
    removeItem: (cartId: string) => void
    updateQuantity: (cartId: string, quantity: number) => void
    updateItemInstructions: (cartId: string, instructions: string) => void
    setOrderType: (type: OrderType | null) => void
    setTableInfo: (number: number, id: string) => void
    setCustomerInfo: (name: string, phone: string, address: string) => void
    setSpecialInstructions: (text: string) => void
    applyCoupon: (coupon: Coupon) => void
    removeCoupon: () => void
    markCouponUsed: (code: string) => void
    clearCart: () => void
    isCouponUsed: (code: string) => boolean
    setJoinExisting: (value: boolean | null) => void
    setTaxRates: (sgst: number, cgst: number) => void

    getSubtotal: () => number
    getTax: () => number
    getSGST: () => number
    getCGST: () => number
    getDeliveryCharge: () => number
    getDiscount: () => number
    getTotal: () => number
    getItemCount: () => number
    getItemByCartId: (cartId: string) => CartItem | undefined
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            orderType: null,
            tableNumber: null,
            tableId: null,
            sessionToken: null,
            specialInstructions: '',
            customerName: '',
            customerPhone: '',
            deliveryAddress: '',
            coupon: null,
            usedCoupons: [],
            joinExisting: null,
            sgst_rate: 2.5,
            cgst_rate: 2.5,

            addItem: (item, quantity, instructions) => {
                // 🔥 DIFFERENTIAL PRICING: Only 1st item of Reward is free/discounted
                const actualBasePrice = item.price || 0;
                const actualDiscountedPrice = (item.discounted_price !== undefined && item.discounted_price !== null) ? item.discounted_price : actualBasePrice;
                
                let calculatedLineTotal = 0;
                if (instructions?.includes('LOYALTY')) {
                    calculatedLineTotal = (actualDiscountedPrice * 1) + (actualBasePrice * (quantity - 1));
                } else {
                    calculatedLineTotal = actualDiscountedPrice * quantity;
                }

                const newItem: CartItem = {
                    ...item,
                    cartId: `${item.id}-${Date.now()}`,
                    quantity,
                    instructions,
                    lineTotal: calculatedLineTotal
                }

                console.log('🛒 STATE UPDATE: Adding', item.name, 'ID:', newItem.cartId);
                
                set((state) => ({ 
                    items: [...state.items, newItem] 
                }))

                console.log('📦 NEW CART SIZE:', get().items.length);
            },
            removeItem: (cartId) => {
                set({ items: get().items.filter((i) => i.cartId !== cartId) })
            },

            updateQuantity: (cartId, quantity) => {
                const { items } = get()
                if (quantity <= 0) {
                    set({ items: items.filter((i) => i.cartId !== cartId) })
                    return
                }

                set({
                    items: items.map((i) => {
                        if (i.cartId !== cartId) return i;
                        
                        const actualBasePrice = i.price || 0;
                        const actualDiscountedPrice = (i.discounted_price !== undefined && i.discounted_price !== null) ? i.discounted_price : actualBasePrice;
                        
                        let calculatedLineTotal = 0;
                        if (i.instructions?.includes('LOYALTY')) {
                            calculatedLineTotal = (actualDiscountedPrice * 1) + (actualBasePrice * (quantity - 1));
                        } else {
                            calculatedLineTotal = actualDiscountedPrice * quantity;
                        }
                        
                        return { ...i, quantity, lineTotal: calculatedLineTotal };
                    })
                })
            },

            updateItemInstructions: (cartId, instructions) => {
                set({
                    items: get().items.map((i) =>
                        i.cartId === cartId ? { ...i, instructions } : i
                    )
                })
            },

            setOrderType: (type) => set({ orderType: type }),
            setTableInfo: (number, id) => set({ tableNumber: number, tableId: id }),
            setCustomerInfo: (name, phone, address) =>
                set({ customerName: name, customerPhone: phone, deliveryAddress: address }),
            setSpecialInstructions: (text) => set({ specialInstructions: text }),
            setJoinExisting: (value) => set({ joinExisting: value }),
            setTaxRates: (sgst, cgst) => set({ sgst_rate: sgst, cgst_rate: cgst }),

            applyCoupon: (coupon) => {
                // Just set the coupon - don't mark as used yet (that happens after order is placed)
                set({ coupon })
            },
            removeCoupon: () => set({ coupon: null }),

            // Call this ONLY after order is successfully placed
            markCouponUsed: (code) => {
                const { usedCoupons } = get()
                if (!usedCoupons.includes(code)) {
                    set({ usedCoupons: [...usedCoupons, code] })
                }
            },

            // Keep usedCoupons persistent - don't clear on cart reset
            clearCart: () => set({ items: [], specialInstructions: '', coupon: null, joinExisting: null }),

            isCouponUsed: (code) => {
                return get().usedCoupons.includes(code)
            },

            getSubtotal: () => {
                return get().items.reduce((sum, item) => sum + item.lineTotal, 0)
            },

            getTax: () => {
                const { sgst_rate, cgst_rate, getSubtotal, getDiscount } = get()
                const taxableAmount = getSubtotal() - getDiscount()
                return (taxableAmount * (sgst_rate + cgst_rate)) / 100
            },

            getSGST: () => {
                const { sgst_rate, getSubtotal, getDiscount } = get()
                return ((getSubtotal() - getDiscount()) * sgst_rate) / 100
            },

            getCGST: () => {
                const { cgst_rate, getSubtotal, getDiscount } = get()
                return ((getSubtotal() - getDiscount()) * cgst_rate) / 100
            },

            getDeliveryCharge: () => {
                const { orderType } = get()
                return orderType === 'home_delivery' ? 50 : 0
            },

            getDiscount: () => {
                const { coupon, getSubtotal } = get()
                const subtotal = getSubtotal()

                if (!coupon) return 0
                if (subtotal < coupon.min_order_amount) return 0

                let discount = 0
                if (coupon.discount_type === 'percentage') {
                    discount = (subtotal * coupon.discount_value) / 100
                } else {
                    discount = coupon.discount_value
                }

                if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
                    discount = coupon.max_discount_amount
                }

                return discount
            },

            getTotal: () => {
                const subtotal = get().getSubtotal()
                const discount = get().getDiscount()
                const { sgst_rate, cgst_rate } = get()
                const tax = (subtotal - discount) * (sgst_rate + cgst_rate) / 100
                const delivery = get().getDeliveryCharge()

                return Math.max(0, subtotal - discount + tax + delivery)
            },

            getItemCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0)
            },

            getItemByCartId: (cartId) => {
                return get().items.find((i) => i.cartId === cartId)
            }
        }),
        {
            name: 'restaurant-cart-storage',
            // skipHydration: true,
        }
    )
)
