'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    UtensilsCrossed, ShoppingCart, Plus, Minus, Trash2, CheckCircle2,
    Armchair, Search, User, Clock, ChefHat, Send, LogOut, RefreshCcw, XCircle, AlertCircle, ChevronRight, ShoppingBag, Loader2, Printer, ChevronLeft
} from 'lucide-react'
import { supabase, getRestaurantId } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { triggerAutomationWebhook } from '@/lib/webhook'

interface Table { id: string; table_number: number; table_name: string; capacity: number; status: string }
interface Category { id: string; name: string }
interface MenuItem { id: string; name: string; price: number; category_id: string; is_veg: boolean; image_url?: string; stock?: number }
interface CartItem extends MenuItem { quantity: number }
interface StaffMember { id: string; name: string }

export default function WaiterDashboard() {
    const [tables, setTables] = useState<Table[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [selectedTable, setSelectedTable] = useState<Table | null>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [search, setSearch] = useState('')
    const [selectedCat, setSelectedCat] = useState('all')
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isPlacing, setIsPlacing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState<'login' | 'name' | 'table' | 'menu'>('login')
    const [passcode, setPasscode] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [staffName, setStaffName] = useState('')
    const [staffId, setStaffId] = useState('')
    const [staffList, setStaffList] = useState<StaffMember[]>([])
    const [tempStaffData, setTempStaffData] = useState<any>(null)
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
    const [selectedApproval, setSelectedApproval] = useState<any>(null)
    const [isApproving, setIsApproving] = useState(false)

    // Refs to avoid stale closures in background interval
    const selectedApprovalRef = useRef(selectedApproval);
    useEffect(() => {
        selectedApprovalRef.current = selectedApproval;
    }, [selectedApproval]);

    useEffect(() => {
        // First explicit load
        fetchAll(false);
        fetchPendingApprovals(false);

        // ULTRA-RESPONSIVE SILENT HEART-BEAT (1.5s)
        // We use a self-invoking function inside to always access fresh logic if needed
        const interval = setInterval(() => {
            fetchPendingApprovals(true); // Silent
            fetchAll(true); // Silent
        }, 1500);

        const ch = supabase.channel('waiter-realtime-v5')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => fetchAll(true))
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, () => {
                fetchAll(true);
                fetchPendingApprovals(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
            clearInterval(interval);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchPendingApprovals(silent = false) {
        try {
            console.log('🔄 [Waiter] Polling for pending approvals...');
            
            // Tier 1: Detailed Join (Preferred)
            let { data, error } = await supabase
                .from('orders')
                .select('*, customers(name, phone), order_items(*), restaurant_tables(table_number)')
                .eq('restaurant_id', getRestaurantId())
                .eq('status', 'pending_confirmation')
                .order('created_at', { ascending: false });

            // Tier 2: Fallback to Explicit Joins
            if (error) {
                console.warn('⚠️ [Waiter] Tier 1 Query Failed, trying Tier 2...', error.message);
                const fallback = await supabase
                    .from('orders')
                    .select('*, customers!customer_id(name, phone), order_items(*), restaurant_tables!table_id(table_number)')
                    .eq('restaurant_id', getRestaurantId())
                    .eq('status', 'pending_confirmation')
                    .order('created_at', { ascending: false });
                data = fallback.data;
                error = fallback.error;
            }
            
            // Tier 3: Absolute Minimal fallback (BUT MUST INCLUDE ITEMS)
            if (error) {
                 console.warn('⚠️ [Waiter] Tier 2 Query Failed, trying Tier 3...', error.message);
                 const rid = getRestaurantId();
                 const minimal = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('restaurant_id', rid)
                    .eq('status', 'pending_confirmation')
                    .order('created_at', { ascending: false });
                data = minimal.data;
                error = minimal.error;
            }

            if (error) {
                console.error('❌ [Waiter Approvals] All Tiers Failed:', error);
                if (!silent) toast.error('Check server connection / RLS');
                return;
            }

            console.log(`✅ [Waiter] Found ${data?.length || 0} pending approvals.`);
            setPendingApprovals(data || []);
            
            const currentSelected = selectedApprovalRef.current;
            
            // Auto-open first one if NOT already in an approval dialog
            if (data && data.length > 0 && !currentSelected) {
                console.log('📢 [Waiter] Auto-opening approval popup for:', data[0].bill_id);
                setSelectedApproval(data[0]); 
                // Play notification sound to alert the waiter
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {});
                } catch (e) {}
            } else if ((!data || data.length === 0) && currentSelected) {
                // If there were approvals but now there is none (e.g. admin accepted others)
                console.log('🧹 [Waiter] No more pending orders, closing popup.');
                setSelectedApproval(null);
            } else if (currentSelected && data && data.length > 0) {
                // If popup is open, check if THE SPECIFIC ORDER is still in the pending list
                const isStillPending = data.some(o => o.id === currentSelected.id);
                if (!isStillPending) {
                    console.log('🧹 [Waiter] Current order handled on another device (Admin), closing popup.');
                    setSelectedApproval(null);
                }
            }
        } catch (err: any) {
            console.error('Fetch approvals error:', err);
        }
    }

    async function handleApproveOrder(orderId: string, accept: boolean) {
        setIsApproving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: accept ? 'pending' : 'cancelled',
                    notes: accept ? `Approved by: ${staffName}` : `Rejected by: ${staffName}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;
            
            toast.success(accept ? 'Order Accepted!' : 'Order Rejected');
            setSelectedApproval(null);
            fetchPendingApprovals(true);
            fetchAll(true); // Refresh tables
        } catch (err: any) {
            toast.error('Failed to update order: ' + err.message);
        } finally {
            setIsApproving(false);
        }
    }

    async function fetchAll(silent = false) {
        try {
            if (!silent) setLoading(true);
            const rid = getRestaurantId();
            const [{ data: tablesData, error: tErr }, { data: catsData, error: cErr }, { data: itemsData, error: iErr }, staffRes] = await Promise.all([
                supabase.from('restaurant_tables').select('*').eq('restaurant_id', rid).order('table_number'),
                supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
                supabase.from('menu_items').select('*').eq('restaurant_id', rid).eq('is_available', true).order('name', { ascending: true }),
                supabase.from('staff').select('id, name').eq('restaurant_id', rid).eq('status', true)
            ]);
            
            const staffData = staffRes.data || [];

            if (tErr || cErr || iErr) {
                console.error('Fetch error:', tErr || cErr || iErr);
                if (!silent) toast.error('Failed to sync dashboard data');
            }

            setTables(tablesData || []);
            setCategories(catsData || []);
            setMenuItems((itemsData || []).filter((i: MenuItem) => !i.name.startsWith('[DELETED]')));
            setStaffList(staffData);

        } catch (err: any) {
            console.error('FetchAll Error:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }

    async function handleVerifyStaff() {
        if (!passcode) return
        setVerifying(true)
        console.log('🔍 Verifying staff with passcode:', passcode)

        try {
            const rid = getRestaurantId();
            const { data: staffList, error } = await supabase
                .from('staff')
                .select('*')
                .eq('passcode', passcode)
                .eq('restaurant_id', rid)

            if (error) {
                console.error('❌ DB Error:', error)
                toast.error('Database Connection Error')
                return
            }

            if (!staffList || staffList.length === 0) {
                // Allows new staff members to proceed to name step for registration
                setStaffId('')
                setStaffName('')
                setStep('name')
                toast.info('New Passcode! Please register your name.')
            } else {
                // PIN matched someone(s). Always ask for Name as per user request to differentiate waiters.
                setStaffId('') 
                setStaffName('')
                setStep('name')
                toast.info('Passcode Verified! Please enter your name to continue.')
            }
        } catch (err) {
            console.error('💥 Login Error:', err)
            toast.error('Login system error')
        } finally {
            setVerifying(false)
        }
    }

    const handleConfirmName = async () => {
        if (!staffName.trim()) {
            toast.error('Please enter your name')
            return
        }

        setVerifying(true)
        try {
            let finalStaffId = staffId
            let finalStaffName = staffName

            // Identify staff by BOTH passcode AND name to prevent overwriting someone else
            const rid = getRestaurantId();
            const { data: existingStaff } = await supabase
                .from('staff')
                .select('*')
                .eq('passcode', passcode)
                .eq('name', staffName.trim())
                .eq('restaurant_id', rid)
                .maybeSingle()

            if (existingStaff) {
                finalStaffId = existingStaff.id
                finalStaffName = existingStaff.name
                // NO OVERWRITE: We just use the existing matching record
            } else {
                // Create NEW staff member
                const rid = getRestaurantId();
                const { data: newStaff, error: insertErr } = await supabase.from('staff').insert({
                    restaurant_id: rid,
                    passcode: passcode,
                    name: staffName,
                    role: passcode === '1801' ? 'admin' : 'waiter',
                    status: true
                }).select().single()

                if (insertErr) {
                    console.error('❌ Insert Error:', insertErr)
                } else if (newStaff) {
                    finalStaffId = newStaff.id
                    finalStaffName = newStaff.name
                }
            }

            // Sync the staff list globally on the dashboard
            await fetchAll()

            setStaffId(finalStaffId)
            setStaffName(finalStaffName)
            setStep('table')
            toast.success(`Welcome, ${finalStaffName}!`)

            // ✅ Track last login in DB
            if (finalStaffId) {
                await supabase.from('staff').update({
                    last_login_at: new Date().toISOString()
                }).eq('id', finalStaffId)
            }

            triggerAutomationWebhook('waiter-login', {
                staff_id: finalStaffId || 'temp',
                name: finalStaffName,
                restaurant_id: getRestaurantId(),
                login_at: new Date().toISOString()
            })
        } catch (err) {
            console.error('💥 Login Save Error:', err)
            setStep('table')
        } finally {
            setVerifying(false)
        }
    }

    const filteredItems = menuItems.filter(item => {
        const matchesCat = selectedCat === 'all' || item.category_id === selectedCat
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        return matchesCat && matchesSearch
    })

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id)
            if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
            return [...prev, { ...item, quantity: 1 }]
        })
        toast.success(`${item.name} added!`, { duration: 1000 })
    }

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0))
    }

    const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

    const handleSelectTable = (table: Table) => {
        setSelectedTable(table)
        setCart([])
        setStep('menu')
    }

    async function placeOrder() {
        if (!selectedTable || cart.length === 0) return
        setIsPlacing(true)
        const rid = getRestaurantId()
        try {
            // 1. Resolve Customer ID first if name OR phone provided
            let customerId: string | null = null
            if (customerName.trim() || customerPhone.trim()) {
                console.log('👤 [Waiter] Resolving customer:', { name: customerName, phone: customerPhone })

                // Clean phone number: take last 10 digits
                const cleanedPhone = customerPhone.replace(/\D/g, '').slice(-10)

                // Try to find by phone if provided
                if (cleanedPhone) {
                    const rid = getRestaurantId();
                    const { data: existing, error: findError } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('phone', cleanedPhone)
                        .eq('restaurant_id', rid)
                        .maybeSingle()

                    if (findError) {
                        console.error('❌ [Waiter] Error finding customer:', findError)
                    } else if (existing) {
                        console.log('✅ [Waiter] Found existing customer:', existing.id)
                        customerId = existing.id
                    }
                }

                // If not found or only name provided, create a new customer record
                if (!customerId) {
                    console.log('🆕 [Waiter] Creating new customer record...')
                    const { data: newCust, error: createError } = await supabase
                        .from('customers')
                        .insert({
                            restaurant_id: rid,
                            name: customerName.trim() || 'Guest',
                            phone: customerPhone.replace(/\D/g, '').slice(-10) || null
                        })
                        .select('id')
                        .single()

                    if (createError) {
                        console.error('❌ [Waiter] Error creating customer:', createError)
                        toast.error(`Customer creation failed: ${createError.message}`)
                        // If creation fails, we SHOULD NOT proceed with customer-specific logic
                        // But let's let it fall back to walk-in if necessary, or throw.
                        // Throwing is safer to avoid merging into wrong bill.
                        throw new Error(`Could not create customer: ${createError.message}`)
                    } else if (newCust) {
                        console.log('✅ [Waiter] New customer created:', newCust.id)
                        customerId = newCust.id
                    }
                }
            } else {
                console.log('👤 [Waiter] No customer details provided, proceeding as Walk-in.')
            }

            // 2. Check for existing active order using Secure API (Robust & bypasses RLS)
            console.log('🔍 [Waiter] Checking for active order on Table:', selectedTable.table_number, 'Customer ID:', customerId)
            const params = new URLSearchParams()
            params.append('restaurantId', rid)
            params.append('tableId', selectedTable.id)
            params.append('tableNumber', selectedTable.table_number.toString())
            params.append('join', 'true') // ALWAYS try to join the existing bill on this table

            if (customerId) {
                params.append('customerId', customerId)
            }

            // Add cache busting
            params.append('t', Date.now().toString())

            const activeRes = await fetch(`/api/orders/active?${params.toString()}`, { cache: 'no-store' })
            const activeData = await activeRes.json()

            if (activeData.error) {
                console.error('❌ [Waiter] API Error:', activeData.error)
                throw new Error(activeData.error)
            }

            const existingOrder = activeData.order

            let orderId = ''
            let billId = ''

            if (existingOrder) {
                console.log('✅ Found existing order:', existingOrder.bill_id)
                orderId = existingOrder.id
                billId = existingOrder.bill_id
                const newTotal = Number(existingOrder.total) + cartTotal

                // Update existing order - Reset status to pending if it was already prepared/served
                // so the kitchen gets notified for the new items
                const statusUpdate = (existingOrder.status === 'served' || existingOrder.status === 'ready' || existingOrder.status === 'completed')
                    ? 'pending'
                    : existingOrder.status

                await supabase.from('orders').update({
                    total: newTotal,
                    customer_id: existingOrder.customer_id || customerId,
                    waiter_id: existingOrder.waiter_id || staffId || null,
                    status: statusUpdate,
                    payment_status: 'pending',
                    notes: (existingOrder.notes || '') + `\n[${staffName}] added +₹${cartTotal}`,
                    updated_at: new Date().toISOString()
                }).eq('id', orderId)

                toast.info(`Adding items to existing Bill #${billId}`)
            } else {
                console.log('🆕 Creating new order for Table:', selectedTable.table_number)
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                billId = `BILL${dateStr}${random}`

                const { data: order, error: orderError } = await supabase.from('orders').insert({
                    restaurant_id: rid,
                    table_id: selectedTable.id,
                    customer_id: customerId,
                    bill_id: billId,
                    waiter_id: staffId || null,
                    status: 'pending',
                    payment_status: 'pending',
                    order_type: 'dine_in',
                    total: cartTotal,
                    notes: `Waiter order - Table ${selectedTable.table_number}`
                }).select('id').single()

                if (orderError) throw orderError
                orderId = order.id

                // Update table status
                await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', selectedTable.id)
            }

            const orderItems = cart.map(c => ({
                order_id: orderId,
                restaurant_id: rid,
                menu_item_id: c.id,
                item_name: c.name,
                quantity: c.quantity,
                price: c.price,
                total: c.price * c.quantity,
                status: 'pending',
                waiter_id: staffId || null,
                waiter_name: staffName || 'Admin'
            }))

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
            if (itemsError) throw itemsError

            // Trigger Webhook with Logging
            try {
                const webhookRes = await triggerAutomationWebhook('waiter-order', {
                    action: 'waiter-order',
                    bill_id: billId,
                    order_id: orderId,
                    table_number: selectedTable.table_number,
                    customer_name: customerName || 'Walk-in',
                    customer_phone: customerPhone || 'N/A',
                    items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
                    total: cartTotal,
                    waiter_name: staffName || 'Guest Waiter',
                    waiter_id: staffId || 'guest',
                    restaurant_id: getRestaurantId(),
                    timestamp: new Date().toISOString()
                })
                console.log('✅ Webhook Sent Successfully:', webhookRes)
            } catch (webhookErr) {
                console.error('❌ Webhook Failure:', webhookErr)
            }

            toast.success(`Items added successfully to Table ${selectedTable.table_number}! 🎉`)
            setCart([])
            setCustomerName('')
            setCustomerPhone('')
            setIsConfirmOpen(false)
            setStep('table')
            setSelectedTable(null)
            fetchAll()
        } catch (err: any) {
            toast.error('Failed to place order: ' + err.message)
        } finally {
            setIsPlacing(false)
        }
    }

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-gray-500 font-bold animate-pulse">Syncing Dashboard...</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 lg:p-6 lg:pb-12 max-w-7xl mx-auto space-y-6">
            {/* Approval Dialog (TOP-LEVEL) */}
            <Dialog open={!!selectedApproval} onOpenChange={(o) => !o && setSelectedApproval(null)}>
                <DialogContent className="sm:max-w-[500px] border-none p-0 overflow-hidden shadow-2xl rounded-[2rem]">
                    <div className="bg-red-600 p-8 text-white relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <Badge className="bg-white/20 text-white border-0 font-bold px-3 py-1 uppercase tracking-wider">#{selectedApproval?.bill_id || 'NEW'}</Badge>
                        </div>
                        <DialogTitle className="text-3xl font-black mb-2">New Order Alert!</DialogTitle>
                        <p className="text-red-100 font-medium opacity-90">Please confirm this order to send it to the kitchen.</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
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

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <span className="text-lg font-black text-gray-900">Grand Total</span>
                            <span className="text-2xl font-black text-red-600">₹{selectedApproval?.total?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="p-8 pt-0 grid grid-cols-2 gap-4">
                        <Button
                            className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-lg shadow-green-600/20"
                            onClick={() => handleApproveOrder(selectedApproval.id, true)}
                            disabled={isApproving}
                        >
                            {isApproving ? '...' : 'ACCEPT'}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 rounded-2xl border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold"
                            onClick={() => handleApproveOrder(selectedApproval.id, false)}
                            disabled={isApproving}
                        >
                            REJECT
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {step === 'login' && (
                <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 max-w-md mx-auto">
                    <div className="text-center space-y-2">
                        <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary/20">
                            <Clock className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Staff Login</h2>
                        <p className="text-gray-500 font-medium">Enter your 4-digit passcode to start</p>
                    </div>

                    <div className="w-full space-y-8">
                        <div className="flex justify-center gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-16 w-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all duration-300",
                                        passcode[i] ? "border-primary bg-primary/5 text-primary scale-110 shadow-lg shadow-primary/10" : "border-gray-200 bg-white text-gray-300"
                                    )}
                                >
                                    {passcode[i] ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    className="h-20 rounded-[1.5rem] text-2xl font-bold bg-white hover:bg-gray-100 border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                                    onClick={() => passcode.length < 4 && setPasscode(p => p + num)}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                className="h-20 rounded-[1.5rem] text-gray-400 font-medium text-lg hover:bg-gray-50 flex items-center justify-center"
                                onClick={() => setPasscode('')}
                            >
                                Clear
                            </button>
                            <button
                                className="h-20 rounded-[1.5rem] text-2xl font-bold bg-white hover:bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center"
                                onClick={() => passcode.length < 4 && setPasscode(p => p + '0')}
                            >
                                0
                            </button>
                            <button
                                className="h-20 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-bold text-xl shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-50"
                                onClick={handleVerifyStaff}
                                disabled={passcode.length < 4 || verifying}
                            >
                                {verifying ? '...' : 'GO'}
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="pt-8 text-center border-t border-gray-100 mt-4">
                                <button
                                    onClick={() => {
                                        setStep('table')
                                        toast.success('Testing Mode Activated')
                                    }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-primary transition-colors underline underline-offset-8 tracking-widest uppercase"
                                >
                                    Skip Login for Testing (Dev Only)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'name' && (
                <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 max-w-md mx-auto animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2">
                        <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary/20">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Who are you?</h2>
                        <p className="text-gray-500 font-medium">Enter your name to start booking orders</p>
                    </div>

                    <div className="w-full space-y-4">
                        <Input
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder="Your Name (e.g. Rahul)"
                            className="h-16 text-xl font-bold text-center rounded-[1.5rem] border-2 border-gray-100 focus:border-primary transition-all shadow-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
                        />
                        <Button
                            className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-bold text-xl shadow-lg shadow-primary/20"
                            onClick={handleConfirmName}
                            disabled={verifying}
                        >
                            {verifying ? 'SAVING...' : 'Continue to Dashboard'}
                        </Button>
                        <button
                            onClick={() => { setStep('login'); setPasscode('') }}
                            className="w-full text-sm text-gray-400 font-bold hover:text-primary transition-colors mt-4"
                        >
                            BACK TO LOGIN
                        </button>
                    </div>
                </div>
            )}

            {step !== 'login' && step !== 'name' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <span className="bg-primary text-white p-2 rounded-xl h-10 w-10 flex items-center justify-center text-sm">W</span>
                                Waiter Dashboard
                            </h1>
                            <p className="text-gray-500 font-medium text-sm mt-1">Live Order Management System</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {staffName && (
                                <div className="px-4 py-2 bg-primary/5 rounded-2xl flex items-center gap-3 border border-primary/10">
                                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center border-2 border-white shadow-sm font-bold text-xs uppercase">
                                        {staffName.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">STAFF ON DUTY</p>
                                        <p className="text-sm font-bold text-gray-900 leading-none">{staffName}</p>
                                    </div>
                                    <button onClick={() => { setStep('login'); setStaffName(''); setPasscode('') }} className="ml-2 hover:bg-red-50 p-1.5 rounded-lg text-red-400 transition-colors">
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border" onClick={() => fetchAll(false)} disabled={loading}>
                                <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </header>



                    {step === 'table' && (
                        <div className="space-y-10">
                            {/* Table Overview Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Available', count: tables.filter(t => t.status === 'available').length, color: 'from-green-400 to-green-600', text: 'text-green-600', bg: 'bg-green-50/50', icon: CheckCircle2 },
                                    { label: 'Occupied', count: tables.filter(t => t.status === 'occupied').length, color: 'from-orange-400 to-orange-600', text: 'text-orange-600', bg: 'bg-orange-50/50', icon: User },
                                    { label: 'Reserved', count: tables.filter(t => t.status === 'reserved').length, color: 'from-red-400 to-red-600', text: 'text-red-600', bg: 'bg-red-50/50', icon: Clock },
                                    { label: 'Total Tables', count: tables.length, color: 'from-blue-400 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50/50', icon: Armchair },
                                ].map(stat => (
                                    <div key={stat.label} className={cn('p-6 rounded-[2rem] border border-transparent transition-all shadow-sm', stat.bg)}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={cn('p-3 rounded-2xl text-white bg-gradient-to-br shadow-lg', stat.color)}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <span className={cn('text-3xl font-bold', stat.text)}>{stat.count}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <Armchair className="h-6 w-6 text-primary" />
                                        Select a Table
                                    </h3>
                                    <Badge variant="outline" className="rounded-full px-4 py-1 font-semibold text-[10px] uppercase tracking-wider text-gray-500 border-2">
                                        REST-ID: {getRestaurantId().slice(0, 6)}...
                                    </Badge>
                                </div>

                                {tables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                        <Armchair className="h-20 w-20 text-gray-200 mb-6" />
                                        <p className="text-xl font-bold text-gray-400">No tables active right now</p>
                                        <p className="text-sm text-gray-400 mt-2 font-medium">Please add tables in Admin &gt; Table Management.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {tables.map(table => (
                                            <button
                                                key={table.id}
                                                onClick={() => (table.status === 'available' || table.status === 'occupied') && handleSelectTable(table)}
                                                disabled={table.status === 'reserved'}
                                                className={cn(
                                                    'relative rounded-[2.5rem] p-6 text-left transition-all duration-500 group border-2',
                                                    (table.status === 'available') ? 'bg-white border-transparent shadow-md hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2' :
                                                        (table.status === 'occupied') ? 'bg-orange-50/30 border-orange-100 hover:shadow-lg hover:-translate-y-1' :
                                                            'bg-gray-50 border-gray-100 cursor-not-allowed grayscale'
                                                )}
                                            >
                                                <div className={cn('absolute top-6 right-6 h-3 w-3 rounded-full',
                                                    table.status === 'available' ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' :
                                                        table.status === 'occupied' ? 'bg-orange-500 shadow-lg shadow-orange-500/50' : 'bg-red-500'
                                                )} />

                                                <div className="text-4xl font-bold text-gray-900 mb-2 mt-4 tracking-tighter">
                                                    {table.table_number.toString().padStart(2, '0')}
                                                </div>
                                                <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">{table.table_name}</div>

                                                <div className="flex items-center justify-between pt-6 border-t border-gray-100/50">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                        <User className="h-4 w-4" /> {table.capacity} SEATS
                                                    </div>
                                                    <div className={cn('text-[10px] font-bold uppercase px-3 py-1 rounded-full',
                                                        table.status === 'available' ? 'bg-green-100 text-green-700' :
                                                            table.status === 'occupied' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                                    )}>
                                                        {table.status}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'menu' && selectedTable && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-primary text-white rounded-[1.25rem] flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/20">
                                            {selectedTable.table_number}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">TABLE VIEW</p>
                                            <p className="text-xl font-bold text-gray-900 leading-none">{selectedTable.table_name}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="rounded-2xl h-12 px-6 font-semibold text-xs uppercase" onClick={() => { setStep('table'); setSelectedTable(null); setCart([]) }}>
                                        Change Table
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Search your favorite dishes..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-12 bg-white border-transparent shadow-sm h-14 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                                        <button
                                            onClick={() => setSelectedCat('all')}
                                            className={cn('px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
                                                selectedCat === 'all' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                                            )}
                                        >All</button>
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCat(cat.id)}
                                                className={cn('px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
                                                    selectedCat === cat.id ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                                                )}
                                            >{cat.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {filteredItems.map(item => {
                                        const inCart = cart.find(c => c.id === item.id)
                                        return (
                                            <div key={item.id} className={cn(
                                                'flex items-center gap-4 p-4 rounded-[2rem] border-4 transition-all duration-300',
                                                inCart ? 'border-primary bg-primary/5' : 'border-white bg-white shadow-sm hover:shadow-xl hover:shadow-gray-200/50'
                                            )}>
                                                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 shadow-inner border border-gray-100">
                                                    {item.image_url
                                                        ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                        : <UtensilsCrossed className="h-8 w-8 m-auto mt-6 text-gray-200" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={cn('h-2.5 w-2.5 rounded-full border-2', item.is_veg ? 'border-green-600 bg-green-500' : 'border-red-600 bg-red-500')} />
                                                        <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                                    </div>
                                                    <span className="font-bold text-primary text-lg">₹{item.price}</span>
                                                </div>

                                                {inCart ? (
                                                    <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-primary/20">
                                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10" onClick={() => updateQty(item.id, -1)}>
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                        <span className="w-8 text-center font-bold text-lg">{inCart.quantity}</span>
                                                        <Button size="icon" className="h-10 w-10 rounded-xl bg-primary text-white shadow-md shadow-primary/30" onClick={() => updateQty(item.id, 1)}>
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-2 hover:bg-primary hover:text-black hover:border-primary transition-all group" onClick={() => addToCart(item)}>
                                                        <Plus className="h-6 w-6 group-hover:scale-125 transition-transform" />
                                                    </Button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <Card className="sticky top-6 border-0 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden">
                                    <div className="bg-primary p-6 text-white">
                                        <CardTitle className="flex items-center gap-3 text-2xl font-bold italic">
                                            <ShoppingCart className="h-8 w-8" />
                                            CURRENT CART
                                            {cartCount > 0 && <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">{cartCount}</span>}
                                        </CardTitle>
                                    </div>
                                    <CardContent className="p-6">
                                        {cart.length === 0 ? (
                                            <div className="text-center py-20">
                                                <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <ShoppingCart className="h-10 w-10 text-gray-200" />
                                                </div>
                                                <p className="font-black text-gray-300 text-lg uppercase tracking-widest">Cart is Empty</p>
                                                <p className="text-xs text-gray-400 mt-2 font-bold px-10">Add some delicious dishes to get started!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                    {cart.map(item => (
                                                        <div key={item.id} className="flex items-center gap-3 group">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">₹{item.price} × {item.quantity}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-gray-900 mb-1">₹{(item.price * item.quantity).toFixed(2)}</p>
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-gray-100 rounded-lg"><Minus className="h-3 w-3" /></button>
                                                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-gray-100 rounded-lg"><Plus className="h-3 w-3" /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-6 border-t-4 border-dashed border-gray-100 space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <span className="font-semibold text-gray-400 uppercase tracking-widest text-xs">Total Amount</span>
                                                        <span className="text-4xl font-bold text-primary tracking-tighter">₹{cartTotal.toFixed(2)}</span>
                                                    </div>
                                                    <Button
                                                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-16 rounded-[1.5rem] shadow-xl shadow-primary/20 text-xl group"
                                                        onClick={() => setIsConfirmOpen(true)}
                                                    >
                                                        SEND TO KITCHEN
                                                        <Send className="h-6 w-6 ml-3 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Confirm Dialog */}
                    <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl flex flex-col max-h-[90vh] [&>button:last-child]:text-slate-400 [&>button:last-child]:hover:text-white [&>button:last-child]:transition-colors">
                            {/* Sticky Header */}
                            <div className="bg-slate-900 p-6 text-white relative shrink-0">
                                <Badge className="absolute top-6 right-6 bg-primary/20 text-primary border-0 font-bold px-3 py-1 text-[10px] tracking-widest uppercase">T{selectedTable?.table_number}</Badge>
                                <ChefHat className="h-10 w-10 text-primary mb-4" />
                                <DialogTitle className="text-2xl font-black tracking-tight mb-1 uppercase italic">Almost Done!</DialogTitle>
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider opacity-70">Review order details</p>
                            </div>

                            {/* Scrollable Body */}
                            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TOTAL PAYABLE</p>
                                        <p className="text-2xl font-black text-primary tracking-tighter">₹{cartTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Items: {cartCount}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-50">BILL ID: AUTO</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-1">Selected Waiter</Label>
                                        <Select
                                            value={staffId || 'guest'}
                                            onValueChange={(id) => {
                                                const s = staffList.find(x => x.id === id);
                                                setStaffId(id);
                                                if (s) setStaffName(s.name);
                                            }}
                                        >
                                            <SelectTrigger className="h-12 bg-white border border-gray-100 rounded-xl font-bold text-sm shadow-sm ring-offset-0 focus:ring-2 focus:ring-primary/20">
                                                <SelectValue placeholder="Select Waiter" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border">
                                                {staffList.map(staff => (
                                                    <SelectItem key={staff.id} value={staff.id} className="font-bold text-xs uppercase tracking-tight">{staff.name}</SelectItem>
                                                ))}
                                                <SelectItem value="guest" className="font-bold text-xs uppercase tracking-tight text-gray-400 italic">Guest Waiter</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-1">Cust. Name</Label>
                                            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in" className="h-12 rounded-xl border border-gray-100 font-bold text-xs" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-1">Phone No.</Label>
                                            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="00000 00000" className="h-12 rounded-xl border border-gray-100 font-bold text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer Actions */}
                            <div className="p-6 pt-0 flex flex-col gap-2 shrink-0 bg-white">
                                <Button
                                    className="w-full h-14 rounded-xl bg-primary hover:bg-slate-950 text-white font-black text-sm shadow-xl shadow-primary/20 uppercase tracking-widest gap-2 transition-all active:scale-95"
                                    onClick={placeOrder}
                                    disabled={isPlacing}
                                >
                                    {isPlacing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                    {isPlacing ? 'PLACING...' : 'CONFIRM & PRINT KOT'}
                                </Button>
                                <Button variant="ghost" className="w-full h-10 font-bold text-gray-400 uppercase tracking-widest text-[10px] hover:bg-gray-50 flex items-center justify-center" onClick={() => setIsConfirmOpen(false)}>
                                    <ChevronLeft className="h-3 w-3 mr-1" />
                                    Go Back
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

        </div>
    )
}
