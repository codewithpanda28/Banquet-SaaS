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

    getSubtotal: () => number
    getTax: () => number
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

            addItem: (item, quantity, instructions) => {
                const { items } = get()
                const newItem: CartItem = {
                    ...item,
                    cartId: `${item.id}-${Date.now()}`,
                    quantity,
                    instructions,
                    lineTotal: (item.discounted_price || item.price) * quantity
                }

                set({ items: [...items, newItem] })
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
                    items: items.map((i) =>
                        i.cartId === cartId
                            ? { ...i, quantity, lineTotal: (i.discounted_price || i.price) * quantity }
                            : i
                    )
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
                // simple 5% tax logic
                return (get().getSubtotal() - get().getDiscount()) * 0.05
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

                if (coupon.max_discount && discount > coupon.max_discount) {
                    discount = coupon.max_discount
                }

                return discount
            },

            getTotal: () => {
                const subtotal = get().getSubtotal()
                const discount = get().getDiscount()
                const tax = (subtotal - discount) * 0.05 // Tax on discounted amount? Usually yes.
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
