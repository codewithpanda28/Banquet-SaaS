'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Plus, Phone, Mail, MapPin, ShoppingBag, TrendingUp, RefreshCw, Clock, Wallet, User } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Customer } from '@/types'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    })

    const fetchCustomers = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true)
            else setRefreshing(true)

            if (!RESTAURANT_ID) {
                console.error('RESTAURANT_ID is missing')
                return
            }

            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Calculate stats for each customer from orders
            const customersWithStats = await Promise.all(
                (data || []).map(async (customer) => {
                    // Fetch ALL orders for this customer
                    const { data: allOrders } = await supabase
                        .from('orders')
                        .select('total, created_at, status')
                        .eq('customer_id', customer.id)
                        .order('created_at', { ascending: false })

                    // Total orders = all orders
                    const total_orders = allOrders?.length || 0

                    // Total spent = sum of ALL orders (or only completed if you want)
                    const total_spent = allOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

                    // Last order = most recent order date
                    const last_order_at = allOrders?.[0]?.created_at || null

                    return {
                        ...customer,
                        total_orders,
                        total_spent,
                        last_order_at
                    }
                })
            )

            setCustomers(customersWithStats)
        } catch (error: any) {
            console.error('Error fetching customers:', error)
            toast.error('Failed to load customers: ' + error.message)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchCustomers()

        // Real-time subscription for customers
        const customersChannel = supabase
            .channel('customers-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'customers',
                    filter: `restaurant_id=eq.${RESTAURANT_ID}`
                },
                () => {
                    fetchCustomers(true)
                }
            )
            .subscribe()

        const ordersChannel = supabase
            .channel('orders-for-customers')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${RESTAURANT_ID}`
                },
                () => {
                    console.log('🔴 Orders updated - refreshing customer stats...')
                    fetchCustomers(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(customersChannel)
            supabase.removeChannel(ordersChannel)
        }
    }, [fetchCustomers])

    useEffect(() => {
        const filtered = customers.filter(customer =>
            customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredCustomers(filtered)
    }, [customers, searchTerm])

    async function handleAddCustomer() {
        try {
            if (!customerForm.phone || !customerForm.name) {
                toast.error('Please fill required fields')
                return
            }

            const { error } = await supabase
                .from('customers')
                .insert({
                    restaurant_id: RESTAURANT_ID,
                    name: customerForm.name,
                    phone: customerForm.phone,
                    email: customerForm.email || null,
                    address: customerForm.address || null,
                    total_orders: 0,
                    total_spent: 0,
                })

            if (error) throw error

            toast.success('Customer added successfully')
            setDialogOpen(false)
            setCustomerForm({ name: '', phone: '', email: '', address: '' })
            fetchCustomers()
        } catch (error: any) {
            console.error('Error adding customer:', error)
            toast.error('Failed to add customer: ' + error.message)
        }
    }

    const stats = {
        total: customers.length,
        active: customers.filter(c => (c.total_orders || 0) > 0).length,
        totalOrders: customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <div className="text-muted-foreground font-medium animate-pulse">Loading amazing customers...</div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Customer Insights"
                description="Manage your loyal customer base and view history"
            >
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchCustomers(true)} disabled={refreshing} className="glass-panel border-primary/20">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </div>
            </PageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Customers', value: stats.total, icon: User, color: 'text-blue-600', gradient: 'from-blue-500/10 to-transparent', border: 'border-blue-200/20' },
                    { label: 'Active Customers', value: stats.active, icon: TrendingUp, color: 'text-emerald-600', gradient: 'from-emerald-500/10 to-transparent', border: 'border-emerald-200/20' },
                    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-purple-600', gradient: 'from-purple-500/10 to-transparent', border: 'border-purple-200/20' }
                ].map((stat, i) => (
                    <Card key={i} className={`glass-card border ${stat.border} relative overflow-hidden group`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
                        <CardContent className="p-0 relative z-10">
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-4xl font-black mt-2 tracking-tight">{stat.value}</p>
                                </div>
                                <div className={`h-12 w-12 rounded-2xl bg-background/50 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="glass-panel border-0 relative">
                <CardContent className="pt-6">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Find Customers</Label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, phone or email..."
                            className="pl-12 h-12 rounded-xl bg-background/50 border-input/50 focus:bg-background transition-all shadow-inner text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Customers List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCustomers.length === 0 ? (
                    <div className="col-span-full glass-panel p-12 flex flex-col items-center justify-center text-muted-foreground gap-2 border-dashed rounded-3xl">
                        <User className="h-12 w-12 opacity-20 mb-2" />
                        <p className="text-lg font-medium">No customers found</p>
                        <p className="text-sm opacity-50">Try adjusting your search criteria</p>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <div key={customer.id} className="glass-card p-0 rounded-3xl border border-white/5 overflow-hidden group hover:border-primary/30 transition-all duration-300 relative flex flex-col h-full bg-gradient-to-b from-card/50 to-card/10">

                            {/* Card Header with Avatar */}
                            <div className="p-6 pb-0 flex items-start gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-white/10 flex items-center justify-center shrink-0 shadow-lg text-xl font-black text-primary group-hover:scale-110 transition-transform duration-500">
                                    {customer.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                                        {customer.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        <span>Member Since {format(new Date(customer.created_at), 'MMM yy')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-6 space-y-4 flex-1">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm bg-secondary/30 p-2.5 rounded-xl border border-white/5">
                                        <Phone className="h-4 w-4 text-blue-500 opacity-80" />
                                        <span className="font-medium tracking-wide">{customer.phone}</span>
                                    </div>

                                    {(customer.email || customer.address) && (
                                        <div className="space-y-2">
                                            {customer.email && (
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground px-2">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    <span className="truncate">{customer.email}</span>
                                                </div>
                                            )}
                                            {customer.address && (
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground px-2">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="truncate">{customer.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer Statistics */}
                            <div className="p-4 bg-muted/40 border-t border-white/5 grid grid-cols-2 gap-px">
                                <div className="text-center border-r border-white/5">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Orders</p>
                                    <p className="text-lg font-black">{customer.total_orders || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Spent</p>
                                    <p className="text-lg font-black text-primary">₹{(customer.total_spent || 0).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Customer Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="glass-panel border border-white/10 bg-background/95 backdrop-blur-xl sm:rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">New Customer Profile</DialogTitle>
                        <DialogDescription>
                            Add details to create a new customer record
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                            <Input
                                id="name"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                placeholder="e.g. Rahul Sharma"
                                className="bg-secondary/20 border-border/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    value={customerForm.phone}
                                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                    placeholder="7282871506"
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email (Optional)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                placeholder="customer@example.com"
                                className="bg-secondary/20 border-border/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address (Optional)</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="address"
                                    value={customerForm.address}
                                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                                    placeholder="Full street address"
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCustomer} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 w-full sm:w-auto">
                            Create Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
