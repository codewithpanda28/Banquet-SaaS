'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Download, Eye, Printer, ShoppingBag, Truck, Utensils, Clock, MapPin, User, Phone, DollarSign, Smartphone, XCircle, UtensilsCrossed, Users, CheckCircle2, Calendar, Wallet, Loader2, Plus } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { triggerPaymentWebhook } from '@/lib/webhook'

// Helper to robustly parse dates primarily from UTC
const parseDate = (dateString: string) => {
    if (!dateString) return new Date()
    // If string comprises T but no Z or +, append Z to force UTC parsing
    if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
        return new Date(dateString + 'Z')
    }
    return new Date(dateString)
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all')
    const [activeTab, setActiveTab] = useState('active')
    const [processingPayment, setProcessingPayment] = useState(false)
    const [selectedApproval, setSelectedApproval] = useState<any>(null)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
    const [isProcessingApproval, setIsProcessingApproval] = useState(false)
    const [isManualOrderOpen, setIsManualOrderOpen] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [availableTables, setAvailableTables] = useState<any[]>([])
    const [manualCart, setManualCart] = useState<any[]>([])
    const [manualOrderType, setManualOrderType] = useState<string>('dine_in')
    const [manualTableId, setManualTableId] = useState<string>('')
    const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '' })
    const [menuSearch, setMenuSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [taxRates, setTaxRates] = useState<{sgst: number, cgst: number}>({ sgst: 2.5, cgst: 2.5 })

    useEffect(() => {
        fetchOrders()

        // Realtime Subscription

        const channel = supabase.channel('admin-orders-live')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload: any) => {
                    console.log('🔄 [REALTIME] Orders update:', payload.eventType, payload.new?.status)
                    const targetOrder = payload.new || payload.old
                    if (!targetOrder || (targetOrder.restaurant_id && targetOrder.restaurant_id !== RESTAURANT_ID)) return

                    if (payload.eventType === 'INSERT' && targetOrder.status === 'pending_confirmation') {
                        // Fetch full details and show popup
                        const { data: fullOrder } = await supabase
                            .from('orders')
                            .select('*, customers(name, phone), order_items(*), restaurant_tables(table_number)')
                            .eq('id', targetOrder.id)
                            .single()

                        if (fullOrder) {
                            setSelectedApproval(fullOrder)
                            setIsApprovalDialogOpen(true)
                        }

                        toast.error('NEW ORDER WAITING FOR CONFIRMATION! 🔔', {
                            duration: 10000,
                            position: 'top-center'
                        })
                    }

                    if (payload.eventType === 'UPDATE') {
                        // IF ORDER WAS HANDLED ELSEWHERE, CLOSE MODAL
                        if (targetOrder.status !== 'pending_confirmation') {
                            setSelectedApproval((prev: any) => {
                                if (prev?.id === targetOrder.id) {
                                    setIsApprovalDialogOpen(false)
                                    return null
                                }
                                return prev
                            })
                        }
                    }

                    // Instant fetch for "Live" feel
                    fetchOrders(false)

                    if (selectedOrder && (payload.new as any)?.id === selectedOrder.id) {
                        handleViewOrder(selectedOrder.id)
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items',
                },
                (payload: any) => {
                    fetchOrders(false)
                    if (selectedOrder && (payload.new as any)?.order_id === selectedOrder.id) {
                        handleViewOrder(selectedOrder.id)
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 [REALTIME] Orders Page Status:', status)
                if (status === 'SUBSCRIBED') {
                    // toast.success('Live Updates Active 🟢', { id: 'realtime-status', duration: 2000 })
                }
            })

        // ULTRA-RESPONSIVE POLLING FALLBACK (2s)
        const interval = setInterval(() => fetchOrders(false), 2000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [])

    useEffect(() => {
        if (isManualOrderOpen) {
            fetchManualOrderData()
        } else {
            // Reset modal state on close
            setManualCart([])
            setManualTableId('')
            setManualCustomer({ name: '', phone: '' })
        }
    }, [isManualOrderOpen])

    async function fetchManualOrderData() {
        try {
            const { data: cats } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('is_active', true)
                .order('sort_order', { ascending: true })

            const { data: items } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('is_available', true)

            const { data: tables } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('is_active', true)

            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('sgst_percentage, cgst_percentage')
                .eq('id', RESTAURANT_ID)
                .single()

            setCategories(cats || [])
            setMenuItems(items || [])
            setAvailableTables(tables || [])
            if (restaurant) {
                setTaxRates({ 
                    sgst: Number(restaurant.sgst_percentage) || 2.5, 
                    cgst: Number(restaurant.cgst_percentage) || 2.5 
                })
            }
        } catch (error) {
            console.error('Error fetching manual order data:', error)
        }
    }

    const addToManualCart = (item: any) => {
        setManualCart(prev => {
            const existing = prev.find(i => i.id === item.id)
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [...prev, { ...item, quantity: 1 }]
        })
        toast.success(`Added ${item.name}`)
    }

    const removeFromManualCart = (itemId: string) => {
        setManualCart(prev => prev.filter(i => i.id !== itemId))
    }

    const updateManualQuantity = (itemId: string, delta: number) => {
        setManualCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const newQty = Math.max(1, i.quantity + delta)
                return { ...i, quantity: newQty }
            }
            return i
        }))
    }

    async function handlePlaceManualOrder() {
        if (manualCart.length === 0) {
            toast.error('Select items first')
            return
        }

        try {
            setProcessingPayment(true)

            // 1. Calculate totals
            const subtotal = manualCart.reduce((acc, item) => {
                const price = item.discounted_price || item.price
                return acc + (price * item.quantity)
            }, 0)

            const sgstRate = taxRates.sgst
            const cgstRate = taxRates.cgst
            const sgstAmount = (subtotal * sgstRate) / 100
            const cgstAmount = (subtotal * cgstRate) / 100
            const total = subtotal + sgstAmount + cgstAmount

            const billId = `BILL${format(new Date(), 'yyyyMMdd')}${Math.floor(Math.random() * 10000)}`

            // 2. Create customer if phone provided
            let customerId = null
            if (manualCustomer.phone) {
                const { data: existingCust } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', manualCustomer.phone)
                    .eq('restaurant_id', RESTAURANT_ID)
                    .maybeSingle()

                if (existingCust) {
                    customerId = existingCust.id
                } else {
                    const { data: newCust } = await supabase
                        .from('customers')
                        .insert([{
                            restaurant_id: RESTAURANT_ID,
                            name: manualCustomer.name || 'Guest',
                            phone: manualCustomer.phone
                        }])
                        .select()
                        .single()
                    customerId = newCust?.id
                }
            }

            // 3. Insert Order
            const { data: newOrder, error: orderErr } = await supabase
                .from('orders')
                .insert([{
                    bill_id: billId,
                    restaurant_id: RESTAURANT_ID,
                    customer_id: customerId,
                    table_id: manualTableId || null,
                    order_type: manualOrderType,
                    status: 'pending', // Auto accepted
                    payment_status: 'pending',
                    subtotal: subtotal,
                    sgst_amount: sgstAmount,
                    cgst_amount: cgstAmount,
                    tax: sgstAmount + cgstAmount,
                    total: total,
                    notes: 'Manual Admin Entry'
                }])
                .select()
                .single()

            if (orderErr) throw orderErr

            // 4. Insert Order Items
            const orderItemsPayload = manualCart.map(item => ({
                order_id: newOrder.id,
                menu_item_id: item.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.discounted_price || item.price,
                total: (item.discounted_price || item.price) * item.quantity
            }))

            const { error: itemsErr } = await supabase
                .from('order_items')
                .insert(orderItemsPayload)

            if (itemsErr) throw itemsErr

            // 5. Mark table occupied if dine-in
            if (manualOrderType === 'dine_in' && manualTableId) {
                await supabase
                    .from('restaurant_tables')
                    .update({ status: 'occupied' })
                    .eq('id', manualTableId)
            }

            toast.success('Manual Order Placed! 🚀')
            setIsManualOrderOpen(false)
            fetchOrders()
            
            // Auto open for print/view
            handleViewOrder(newOrder.id)
        } catch (error) {
            console.error('Error placing manual order:', error)
            toast.error('Placement failed')
        } finally {
            setProcessingPayment(false)
        }
    }

    async function fetchOrders(showLoading = true) {
        try {
            if (showLoading) setLoading(true)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers!customer_id (id, name, phone, email, address),
                    restaurant_tables!table_id (table_number)
                `)
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            setOrders(data || [])

            // AUTO-OPEN POPUP FOR PENDING APPROVALS
            const firstPending = data?.find(o => o.status === 'pending_confirmation')
            if (firstPending && !selectedOrder && !isApprovalDialogOpen) {
                // Fetch full details and show popup
                (async () => {
                    const { data: fullOrder } = await supabase
                        .from('orders')
                        .select('*, customers(name, phone), order_items(*), restaurant_tables(table_number)')
                        .eq('id', firstPending.id)
                        .single()

                    if (fullOrder) {
                        setSelectedApproval(fullOrder)
                        setIsApprovalDialogOpen(true)
                    }
                })()
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        filterOrders()
    }, [orders, searchTerm, orderTypeFilter])

    function filterOrders() {
        let filtered = [...orders]

        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter((o) => o.order_type === orderTypeFilter)
        }

        if (searchTerm) {
            filtered = filtered.filter((o: any) => {
                const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
                return (
                    o.bill_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (customer?.phone || o.customer_phone)?.includes(searchTerm) ||
                    (customer?.name || o.customer_name)?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            })
        }

        setFilteredOrders(filtered)
    }

    async function handleViewOrder(orderId: string) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers (id, name, phone, email, address),
                    restaurant_tables (table_number),
                    order_items (*)
                `)
                .eq('id', orderId)
                .single()

            if (error) throw error
            setSelectedOrder(data)
        } catch (error) {
            console.error('❌ [ORDERS PAGE] Error fetching order details:', error)
            toast.error('Failed to load order details')
        }
    }

    async function handleUpdateStatus(orderId: string, newStatus: string, notes?: string) {
        try {
            setIsProcessingApproval(true)
            const updatePayload: any = {
                status: newStatus,
                updated_at: new Date().toISOString()
            }
            if (notes) updatePayload.notes = notes

            const { error } = await supabase
                .from('orders')
                .update(updatePayload)
                .eq('id', orderId)

            if (error) throw error

            toast.success(`Order status updated to ${newStatus.toUpperCase()}`)
            setSelectedOrder(null)
            setIsApprovalDialogOpen(false)
            fetchOrders()
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error('Failed to update status')
        } finally {
            setIsProcessingApproval(false)
        }
    }

    async function handleAcceptOrder(orderId: string) {
        await handleUpdateStatus(orderId, 'pending', 'Approved by Admin')
    }

    async function handleRejectOrder(orderId: string) {
        await handleUpdateStatus(orderId, 'cancelled', 'Rejected by Admin')
    }

    function handlePrintOrder(order: any) {
        const printWindow = window.open('', '', 'height=600,width=800')
        if (!printWindow) {
            toast.error('Please allow popups to print')
            return
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Order ${order.bill_id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        h1 { font-size: 18px; margin: 0; }
                        p { margin: 2px 0; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { text-align: left; padding: 4px 0; }
                        .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; text-align: right; font-weight: bold; }
                        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>RESTAURANT NAME</h1>
                        <p>123 Food Street, City</p>
                        <p>Phone: +91 7282871506</p>
                    </div>
                    <p><strong>Order:</strong> ${order.bill_id}</p>
                    <p><strong>Date:</strong> ${format(parseDate(order.created_at), 'dd/MM/yy hh:mm a')}</p>
                    <p><strong>Customer:</strong> ${order.customers?.name || 'Walk-in'}</p>
                   
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align:right">Qty</th>
                                <th style="text-align:right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.order_items?.map((item: any) => `
                                <tr>
                                    <td>${item.item_name}</td>
                                    <td style="text-align:right">${item.quantity}</td>
                                    <td style="text-align:right">${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>
                    
                    <div class="total">
                        <p>Subtotal: ₹${(order.subtotal || order.total - (order.tax || 0)).toFixed(2)}</p>
                        <p>SGST (${order.sgst_percentage || 2.5}%): ₹${(order.sgst_amount || 0).toFixed(2)}</p>
                        <p>CGST (${order.cgst_percentage || 2.5}%): ₹${(order.cgst_amount || 0).toFixed(2)}</p>
                        ${order.discount > 0 ? `<p>Discount: -₹${order.discount.toFixed(2)}</p>` : ''}
                        <p><strong>Total: ₹${order.total.toFixed(2)}</strong></p>
                    </div>
                    <div class="footer">
                        <p>Thank get for dining with us!</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    function exportOrders() {
        try {
            const csvContent = [
                ['Bill ID', 'Customer', 'Phone', 'Type', 'Table', 'Total', 'Status', 'Payment', 'Date'],
                ...filteredOrders.map((order: any) => [
                    order.bill_id,
                    order.customers?.name || 'Walk-in',
                    order.customers?.phone || 'N/A',
                    order.order_type.replace('_', ' '),
                    order.restaurant_tables ? `Table ${order.restaurant_tables.table_number}` : 'N/A',
                    `₹${order.total.toFixed(2)}`,
                    order.status,
                    order.payment_method,
                    format(parseDate(order.created_at), 'dd/MM/yyyy hh:mm a')
                ])
            ]

            const csv = csvContent.map(row => row.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orders-${format(new Date(), 'dd-MM-yyyy')}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Orders exported successfully!')
        } catch (error) {
            console.error('Error exporting orders:', error)
            toast.error('Failed to export orders')
        }
    }

    async function handlePayment(method: 'cash' | 'upi' | 'mixed') {
        if (!selectedOrder) return

        try {
            setProcessingPayment(true)

            // 1. Update Payment Status in Database
            const { error } = await supabase
                .from('orders')
                .update({
                    payment_status: 'paid',
                    payment_method: method,
                    status: 'completed'
                })
                .eq('id', selectedOrder.id)

            if (error) throw error

            // Trigger n8n Webhook for Payment Confirmation
            await triggerPaymentWebhook({
                bill_id: selectedOrder.bill_id,
                amount: selectedOrder.total,
                customer: {
                    name: selectedOrder.customers?.name || selectedOrder.customer_name || 'Walk-in',
                    phone: selectedOrder.customers?.phone || 'N/A',
                    address: selectedOrder.delivery_address || selectedOrder.customers?.address
                },
                order_type: selectedOrder.order_type,
                table_number: Array.isArray(selectedOrder.restaurant_tables) ? selectedOrder.restaurant_tables[0]?.table_number : selectedOrder.restaurant_tables?.table_number,
                items: selectedOrder.order_items?.map((i: any) => ({
                    name: i.item_name,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.total
                })),
                payment_method: method,
                payment_status: 'paid',
                restaurant_id: RESTAURANT_ID,
                updated_at: new Date().toISOString(),
                source: 'admin_dashboard',
                trigger_type: 'payment_marked_manually'
            })

            toast.success(`Payment marked as ${method.toUpperCase()} & Message Sent 🚀`)

            // 3. Mark Table as Available and Clear Bookings if it's a Dine In order
            if (selectedOrder.table_id) {
                // Set table back to available
                await supabase
                    .from('restaurant_tables')
                    .update({ status: 'available' })
                    .eq('id', selectedOrder.table_id)

                // Also mark the specific 'seated' booking for this table as completed
                // This ensures the QR scan doesn't see it as "occupied" after payment
                await supabase
                    .from('table_bookings')
                    .update({ status: 'completed' })
                    .eq('table_id', selectedOrder.table_id)
                    .eq('status', 'seated')
                    .eq('booking_date', new Date().toISOString().split('T')[0])
            }

            setSelectedOrder(null)
            fetchOrders()
        } catch (error) {
            console.error('Error processing payment:', error)
            toast.error('Failed to update payment')
        } finally {
            setProcessingPayment(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending_confirmation: 'bg-red-500/10 text-red-600 border-red-200/50 dark:text-red-400 animate-pulse',
            pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:text-yellow-400',
            confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200/50 dark:text-blue-400',
            preparing: 'bg-orange-500/10 text-orange-600 border-orange-200/50 dark:text-orange-400',
            ready: 'bg-purple-500/10 text-purple-600 border-purple-200/50 dark:text-purple-400',
            served: 'bg-green-500/10 text-green-600 border-green-200/50 dark:text-green-400',
            completed: 'bg-green-500/10 text-green-600 border-green-200/50 dark:text-green-400',
            cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
        }
        return (
            <Badge variant="outline" className={cn("backdrop-blur-md uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 border", styles[status] || styles.pending)}>
                {status}
            </Badge>
        )
    }

    const renderOrders = (tab: string) => {
        const list = tab === 'active' ? 
            filteredOrders.filter(o => ['pending_confirmation', 'pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)) :
            filteredOrders.filter(o => o.status === tab)

        if (list.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 glass-card rounded-3xl border-dashed border-2 bg-gray-50/50">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-xl font-medium text-gray-500">No {tab} orders found</p>
                </div>
            )
        }

        return list.map((order: any) => (
            <div
                key={order.id}
                className="glass-card p-0 rounded-2xl border border-gray-100 overflow-hidden group hover:border-green-500/50 hover:shadow-lg transition-all duration-300 bg-white mb-4"
            >
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-transparent" />
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black tracking-tight text-gray-900">{order.bill_id}</h3>
                            {getStatusBadge(order.status)}
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0">
                                {order.order_type.replace('_', ' ')}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-gray-900">{(Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name) || order.customer_name || 'Guest'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span>{format(parseDate(order.created_at), 'hh:mm a')}</span>
                            </div>
                            {order.restaurant_tables && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span>T-{Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0]?.table_number : order.restaurant_tables.table_number}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-6 border-l border-gray-100 pl-6 border-dashed">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
                            <p className="text-3xl font-black text-gray-900">₹{Number(order.total).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button size="sm" className="bg-green-50 text-green-700 hover:bg-green-600 hover:text-white font-bold" onClick={() => handleViewOrder(order.id)}>View</Button>
                            <Button size="sm" variant="ghost" onClick={() => handlePrintOrder(order)}>Print</Button>
                        </div>
                    </div>
                </div>
            </div>
        ))
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Orders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Orders Management"
                description="Track and manage all your restaurant orders in real-time"
            >
                <div className="flex gap-3">
                    <Button 
                        onClick={() => setIsManualOrderOpen(true)} 
                        className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                    >
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Manual Order
                    </Button>
                    <Button variant="outline" onClick={exportOrders} className="glass-panel hover:bg-white/20 border-primary/20 bg-primary/5">
                        <Download className="mr-2 h-4 w-4 text-primary" />
                        Export CSV
                    </Button>
                </div>
            </PageHeader>

            {/* Filters */}
            <Card className="glass-card border-0 relative overflow-hidden mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 via-transparent to-green-50/50 pointer-events-none" />
                <CardContent className="pt-6 relative z-10">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Search Orders</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search by Bill ID, Customer Name or Phone..."
                                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-green-500 transition-all text-black placeholder:text-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-56 space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter by Type</Label>
                            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                                <SelectTrigger className="h-10 bg-gray-50 border-gray-200 text-black focus:ring-green-500">
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200 text-black">
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="dine_in">🍽️ Dine In</SelectItem>
                                    <SelectItem value="take_away">🥡 Takeaway</SelectItem>
                                    <SelectItem value="home_delivery">🚚 Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
                <div className="flex justify-center mb-6">
                    <TabsList className="bg-gray-100 p-1 rounded-full border border-gray-200">
                        <TabsTrigger value="active" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Active Orders <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-200 border-0">{orders.filter((o) => ['pending_confirmation', 'pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)).length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Completed <span className="ml-2 opacity-70 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{orders.filter((o) => o.status === 'completed').length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Cancelled <span className="ml-2 opacity-70 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{orders.filter((o) => o.status === 'cancelled').length}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="active" className="space-y-4">
                    {renderOrders('active')}
                </TabsContent>
                <TabsContent value="completed" className="space-y-4">
                    {renderOrders('completed')}
                </TabsContent>
                <TabsContent value="cancelled" className="space-y-4">
                    {renderOrders('cancelled')}
                </TabsContent>
            </Tabs>


            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-xl max-h-[85vh] flex flex-col bg-background p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">Order Details</DialogTitle>
                    {selectedOrder && (
                        <div className="flex flex-col flex-1 overflow-hidden bg-white">
                            {/* Premium Header - Fixed */}
                            <div className="flex flex-col gap-1 p-6 pb-2 shrink-0 bg-white z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            Order #{selectedOrder.bill_id}
                                            <Badge className={cn(
                                                "ml-2 text-[10px] px-2 py-0.5 uppercase tracking-wide border-0",
                                                selectedOrder.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    selectedOrder.status === 'pending' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                                        "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            )}>
                                                {selectedOrder.status}
                                            </Badge>
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(parseDate(selectedOrder.created_at), 'PPP')} at {format(parseDate(selectedOrder.created_at), 'p')}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={() => setSelectedOrder(null)}>
                                        <XCircle className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>

                            <div className="px-6 py-2 shrink-0">
                                <div className="h-px bg-gray-100 w-full" />
                            </div>

                            {/* Scrollable Content Body */}
                            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-6 pb-6 pt-2">
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" /> Customer
                                        </p>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-base">{selectedOrder.customers?.name || 'Walk-in Customer'}</p>
                                            <p className="text-sm text-gray-500 font-medium">{selectedOrder.customers?.phone || 'No Phone'}</p>
                                        </div>
                                        {(selectedOrder.delivery_address || selectedOrder.customers?.address) && (
                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                                                {selectedOrder.delivery_address || selectedOrder.customers?.address}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <UtensilsCrossed className="h-3.5 w-3.5" /> Order Info
                                        </p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-medium">Type:</span>
                                                <span className="font-semibold text-gray-900 capitalize">{selectedOrder.order_type?.replace('_', ' ') || 'Dine In'}</span>
                                            </div>
                                            {selectedOrder.restaurant_tables && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 font-medium">Table No:</span>
                                                    <span className="font-semibold text-gray-900">#{selectedOrder.restaurant_tables.table_number}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-medium">Payment:</span>
                                                <span className={cn("font-semibold capitalize", selectedOrder.payment_status === 'paid' ? "text-green-600" : "text-orange-600")}>
                                                    {selectedOrder.payment_status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-4">
                                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                                            <div className="col-span-6 pl-2">Item</div>
                                            <div className="col-span-2 text-center">Qty</div>
                                            <div className="col-span-4 text-right pr-2">Total</div>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {selectedOrder.order_items?.map((item: any) => (
                                                <div key={item.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50/50 transition-colors">
                                                    <div className="col-span-6 pl-2">
                                                        <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">₹{(Number(item.total) / Number(item.quantity)).toFixed(2)} each</p>
                                                    </div>
                                                    <div className="col-span-2 flex justify-center">
                                                        <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                                            {item.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 text-right pr-2">
                                                        <p className="text-sm font-bold text-gray-900">₹{item.total.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Summary */}
                                        <div className="bg-gray-50 p-4 border-t border-gray-200">
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-gray-500 font-medium">Subtotal</span>
                                                <span className="font-semibold text-gray-900">₹{(selectedOrder.subtotal || selectedOrder.total - (selectedOrder.tax || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-gray-500 font-medium">SGST</span>
                                                <span className="font-semibold text-gray-900">₹{(selectedOrder.sgst_amount || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-gray-500 font-medium">CGST</span>
                                                <span className="font-semibold text-gray-900">₹{(selectedOrder.cgst_amount || 0).toFixed(2)}</span>
                                            </div>
                                            {selectedOrder.discount > 0 && (
                                                <div className="flex justify-between items-center text-sm mb-1 text-green-600">
                                                    <span className="font-medium">Discount</span>
                                                    <span className="font-semibold">-₹{selectedOrder.discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                                                <span className="text-base font-bold text-gray-900">Grand Total</span>
                                                <span className="text-2xl font-black text-gray-900">₹{selectedOrder.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-4" /> {/* Spacer */}
                            </div>

                            {/* Actions Footer - Fixed */}
                            <div className="p-6 pt-2 shrink-0 bg-white border-t border-gray-50 z-10">
                                {selectedOrder.status === 'cancelled' ? (
                                    <div className="w-full h-11 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                        <XCircle className="h-5 w-5 text-red-600" />
                                        Order Cancelled
                                    </div>
                                ) : selectedOrder.status === 'completed' || selectedOrder.payment_status === 'paid' ? (
                                    <div className="w-full h-11 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        Payment Completed {selectedOrder.payment_method ? `via ${selectedOrder.payment_method.toUpperCase()}` : ''}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {selectedOrder.status === 'pending_confirmation' ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    className="h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
                                                    onClick={() => handleAcceptOrder(selectedOrder.id)}
                                                    disabled={processingPayment}
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Order
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold shadow-sm"
                                                    onClick={() => handleRejectOrder(selectedOrder.id)}
                                                    disabled={processingPayment}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" /> Reject Order
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-3">
                                                <Button
                                                    className="h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
                                                    onClick={() => handlePayment('cash')}
                                                    disabled={processingPayment}
                                                >
                                                    <DollarSign className="mr-2 h-4 w-4" /> Cash
                                                </Button>
                                                <Button
                                                    className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                                                    onClick={() => handlePayment('upi')}
                                                    disabled={processingPayment}
                                                >
                                                    <Smartphone className="mr-2 h-4 w-4" /> UPI
                                                </Button>
                                                <Button
                                                    className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                                                    onClick={() => handlePayment('mixed')}
                                                    disabled={processingPayment}
                                                >
                                                    <Wallet className="mr-2 h-4 w-4" /> Mixed
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* NEW: Automatic Approval Popup */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-none p-0 overflow-hidden shadow-2xl rounded-[2rem]">
                    <div className="bg-red-600 p-8 text-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <Badge className="bg-white/20 text-white border-0 font-bold px-3 py-1 uppercase tracking-wider">#{selectedApproval?.bill_id}</Badge>
                        </div>
                        <DialogTitle className="text-3xl font-black mb-2">New Order Alert!</DialogTitle>
                        <p className="text-red-100 font-medium opacity-90">Please confirm this order to send it to the kitchen.</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-gray-900">{selectedApproval?.customers?.name || 'Walk-in'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Table</p>
                                <p className="font-bold text-gray-900">T{selectedApproval?.restaurant_tables?.table_number || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Items</p>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {selectedApproval?.order_items?.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="h-6 w-6 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-[10px] font-black">{item.quantity}</span>
                                            <span className="text-sm font-bold text-gray-800">{item.item_name}</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">₹{item.total?.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Subtotal</span>
                                <span className="font-bold text-gray-900">₹{(selectedApproval?.subtotal || (selectedApproval?.total || 0) - (selectedApproval?.tax || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">SGST ({selectedApproval?.sgst_percentage || 2.5}%)</span>
                                <span className="font-bold text-gray-900">₹{(selectedApproval?.sgst_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">CGST ({selectedApproval?.cgst_percentage || 2.5}%)</span>
                                <span className="font-bold text-gray-900">₹{(selectedApproval?.cgst_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                                <span className="text-lg font-black text-gray-900">Grand Total</span>
                                <span className="text-2xl font-black text-red-600">₹{selectedApproval?.total?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 pt-0 grid grid-cols-2 gap-4">
                        <Button
                            className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-lg shadow-green-600/20"
                            onClick={() => handleAcceptOrder(selectedApproval.id)}
                            disabled={isProcessingApproval}
                        >
                            {isProcessingApproval ? '...' : 'ACCEPT'}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 rounded-2xl border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold"
                            onClick={() => handleRejectOrder(selectedApproval.id)}
                            disabled={isProcessingApproval}
                        >
                            REJECT
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isManualOrderOpen} onOpenChange={setIsManualOrderOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[1200px] w-full rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white h-[90vh] max-h-[90vh] flex flex-col">
                    <div className="flex flex-col h-full bg-white flex-1 overflow-hidden">
                        {/* Improved Header */}
                        <DialogHeader className="p-8 pb-6 bg-gradient-to-r from-gray-900 to-slate-800 text-white flex-row items-center justify-between space-y-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10" />
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold tracking-tight leading-none mb-2 underline decoration-primary decoration-4 underline-offset-8">Quick Billing</h2>
                                <p className="text-gray-400 text-sm font-medium">Create and process manual orders for walk-in guests</p>
                            </div>
                            
                            <div className="flex gap-4 items-center bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold uppercase text-gray-300 ml-1">Service Type</Label>
                                    <Select value={manualOrderType} onValueChange={(v: any) => setManualOrderType(v)}>
                                        <SelectTrigger className="w-[140px] h-10 border-white/10 bg-white/10 hover:bg-white/20 focus:ring-0 text-sm font-semibold text-white rounded-xl transition-colors">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dine_in">🍽️ Dine In</SelectItem>
                                            <SelectItem value="take_away">🥡 Takeaway</SelectItem>
                                            <SelectItem value="home_delivery">🚚 Delivery</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualOrderType === 'dine_in' && (
                                    <div className="flex flex-col gap-1 pl-4 border-l border-white/10">
                                        <Label className="text-[10px] font-bold uppercase text-gray-300 ml-1">Assign Table</Label>
                                        <Select value={manualTableId} onValueChange={setManualTableId}>
                                            <SelectTrigger className="w-[120px] h-10 border-white/10 bg-white/10 hover:bg-white/20 focus:ring-0 text-sm font-semibold text-white rounded-xl transition-colors">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableTables.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>

                        <div className="flex-1 flex overflow-hidden h-full">
                            {/* Left: Menu Area */}
                            <div className="flex-1 flex flex-col h-full border-r border-gray-100 overflow-hidden relative">
                                <div className="p-8 pb-4 shrink-0">
                                    <div className="flex gap-3 items-center mb-6 overflow-x-auto no-scrollbar pb-2">
                                        <Button
                                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                            onClick={() => setSelectedCategory('all')}
                                            className="rounded-2xl h-11 px-6 font-semibold text-sm transition-all shadow-sm shrink-0"
                                        >
                                            All Menu
                                        </Button>
                                        {categories.map(cat => (
                                            <Button
                                                key={cat.id}
                                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className="rounded-2xl h-11 px-6 font-semibold text-sm whitespace-nowrap shadow-sm shrink-0"
                                            >
                                                {cat.name}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            placeholder="Search items by name or price..."
                                            className="pl-12 h-14 bg-gray-50 border-gray-200 rounded-2xl text-lg font-medium focus:bg-white"
                                            value={menuSearch}
                                            onChange={(e) => setMenuSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-8 pt-2 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-white">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                        {menuItems
                                            .filter(item => (selectedCategory === 'all' || item.category_id === selectedCategory))
                                            .filter(item => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                                            .map(item => (
                                                <Card 
                                                    key={item.id} 
                                                    className="group cursor-pointer hover:border-primary border-2 border-transparent transition-all shadow-md hover:shadow-xl bg-white overflow-hidden relative active:scale-95 flex flex-col h-full"
                                                    onClick={() => addToManualCart(item)}
                                                >
                                                    {item.image_url && (
                                                        <div className="h-36 w-full bg-gray-100 relative overflow-hidden shrink-0">
                                                            <img 
                                                                src={item.image_url} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    <CardContent className={cn("p-5 flex-1 flex flex-col relative", item.image_url ? "pt-4" : "")}>
                                                        <div className="flex justify-between items-start mb-3 gap-3">
                                                            <div className="flex gap-2 items-start mt-1">
                                                                <div className={cn(
                                                                    "h-3 w-3 rounded-full shadow-sm shrink-0 mt-1.5",
                                                                    item.is_veg ? "bg-green-500 border-2 border-green-200" : "bg-red-500 border-2 border-red-200"
                                                                )} />
                                                                <h4 className="font-semibold text-gray-800 text-base leading-tight line-clamp-2">{item.name}</h4>
                                                            </div>
                                                            <span className="font-bold text-xl text-gray-900 shrink-0">₹{item.discounted_price || item.price}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 font-medium line-clamp-2 mt-auto pt-2">{item.description}</p>
                                                    </CardContent>

                                                    <div className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white rounded-lg shadow-lg">
                                                        <Plus className="h-4 w-4" />
                                                    </div>
                                                </Card>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Cart Area */}
                            <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 bg-gray-50 flex flex-col h-full border-l border-gray-100 overflow-hidden relative z-10 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.05)]">
                                <div className="flex flex-col flex-1 min-h-0 p-6 pb-0">
                                    <div className="space-y-2 shrink-0 mb-4">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guest Information</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Customer Name"
                                                className="bg-white border-gray-200 h-9 text-xs rounded-lg font-medium focus:ring-primary shadow-sm"
                                                value={manualCustomer.name}
                                                onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                                            />
                                            <Input
                                                placeholder="Phone Number"
                                                className="bg-white border-gray-200 h-9 text-xs rounded-lg font-medium focus:ring-primary shadow-sm"
                                                value={manualCustomer.phone}
                                                onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                                        <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 shrink-0 mb-3">Current Bill Items ({manualCart.length})</Label>
                                        
                                        {manualCart.length === 0 ? (
                                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-white/50">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 border border-gray-100">
                                                    <UtensilsCrossed className="h-6 w-6 text-gray-300" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-400 leading-tight">Your cart is <br/>empty</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-0 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-2 pb-4">
                                                {manualCart.map(item => {
                                                    const price = item.discounted_price || item.price;
                                                    const total = price * item.quantity;
                                                    return (
                                                        <div key={item.id} className="flex flex-col py-3.5 border-b border-gray-200 last:border-0 group">
                                                            <div className="flex justify-between items-start gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn(
                                                                            "h-2 w-2 rounded-full shrink-0",
                                                                            item.is_veg ? "bg-green-500" : "bg-red-500"
                                                                        )} />
                                                                        <h5 className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</h5>
                                                                    </div>
                                                                    <p className="text-[11px] font-medium text-gray-500 mt-1.5 ml-4">₹{price.toFixed(2)} × {item.quantity}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-bold text-gray-900">₹{total.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-3 ml-4">
                                                                <button 
                                                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider transition-colors"
                                                                    onClick={() => removeFromManualCart(item.id)}
                                                                >
                                                                    Remove
                                                                </button>
                                                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                                                    <button 
                                                                        className="h-7 w-7 rounded-md bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition-all" 
                                                                        onClick={() => item.quantity === 1 ? removeFromManualCart(item.id) : updateManualQuantity(item.id, -1)}
                                                                    >
                                                                        <span className="text-lg font-medium leading-none mb-0.5">−</span>
                                                                    </button>
                                                                    <span className="text-xs font-bold w-6 text-center text-gray-900">{item.quantity}</span>
                                                                    <button 
                                                                        className="h-7 w-7 rounded-md bg-green-50 flex items-center justify-center text-green-700 hover:bg-green-100 active:scale-95 transition-all" 
                                                                        onClick={() => updateManualQuantity(item.id, 1)}
                                                                    >
                                                                        <span className="text-lg font-medium leading-none mb-0.5">+</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* Spacer to prevent scroll cutoff bug */}
                                                <div className="h-6 w-full shrink-0"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 bg-gray-50 px-6 pb-6 pt-4 border-t border-gray-200 space-y-3">
                                    <div className="space-y-1.5 px-1">
                                        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500">
                                            <span className="uppercase tracking-wider">Subtotal</span>
                                            <span className="text-gray-900 font-bold">₹{manualCart.reduce((acc, item) => acc + (item.discounted_price || item.price) * item.quantity, 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                                            <span className="uppercase tracking-wider">SGST ({taxRates.sgst}%)</span>
                                            <span className="text-gray-600">₹{(manualCart.reduce((acc, item) => acc + (item.discounted_price || item.price) * item.quantity, 0) * (taxRates.sgst / 100)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                                            <span className="uppercase tracking-wider">CGST ({taxRates.cgst}%)</span>
                                            <span className="text-gray-600">₹{(manualCart.reduce((acc, item) => acc + (item.discounted_price || item.price) * item.quantity, 0) * (taxRates.cgst / 100)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-3 mt-1 border-t border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Payable</p>
                                            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
                                                ₹{(
                                                    manualCart.reduce((acc, item) => acc + (item.discounted_price || item.price) * item.quantity, 0) 
                                                    * (1 + (taxRates.sgst + taxRates.cgst) / 100)
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:grayscale disabled:opacity-50"
                                        onClick={handlePlaceManualOrder}
                                        disabled={manualCart.length === 0 || processingPayment}
                                    >
                                        {processingPayment ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                            <>
                                                <Printer className="h-5 w-5" />
                                                Print & Settle
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
