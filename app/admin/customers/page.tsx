'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Plus, Phone, Mail, MapPin, ShoppingBag, TrendingUp, RefreshCw, Clock } from 'lucide-react'
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

        // ALSO subscribe to orders - customer stats depend on orders!
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Customers"
                description="Manage customer database and insights"
            >
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchCustomers(true)} disabled={refreshing}>
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
                    { label: 'Total Customers', value: stats.total, icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Customers', value: stats.active, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50' }
                ].map((stat, i) => (
                    <Card key={i} className="border-0 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-0">
                            <div className={`h-1 w-full ${stat.color.replace('text', 'bg')}`} />
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-4xl font-black mt-1">{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, phone or email..."
                            className="pl-12 h-14 text-lg rounded-xl border-muted bg-muted/50 focus:bg-white transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Customers List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.length === 0 ? (
                    <Card className="border-2 border-dashed md:col-span-2 lg:col-span-3">
                        <CardContent className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <div className="bg-muted p-4 rounded-full">
                                <Search className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="font-medium">No customers found matching your search</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 group rounded-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm font-bold border-0 shadow-sm">
                                    {customer.total_orders || 0} Orders
                                </Badge>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-black text-xl text-foreground group-hover:text-primary transition-colors">
                                            {customer.name || 'Unnamed Customer'}
                                        </h3>
                                        <p className="text-xs font-mono text-muted-foreground mt-1">
                                            ID: {customer.id.slice(0, 8).toUpperCase()}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 pt-2">
                                        <div className="flex items-center text-sm font-medium bg-secondary/30 p-2 rounded-lg">
                                            <div className="bg-white p-1.5 rounded-md shadow-sm mr-3">
                                                <Phone className="h-4 w-4 text-blue-600" />
                                            </div>
                                            {customer.phone}
                                        </div>
                                        {customer.email && (
                                            <div className="flex items-center text-sm font-medium bg-secondary/30 p-2 rounded-lg">
                                                <div className="bg-white p-1.5 rounded-md shadow-sm mr-3">
                                                    <Mail className="h-4 w-4 text-emerald-600" />
                                                </div>
                                                {customer.email}
                                            </div>
                                        )}
                                        {customer.address && (
                                            <div className="flex items-center text-sm font-medium bg-secondary/30 p-2 rounded-lg">
                                                <div className="bg-white p-1.5 rounded-md shadow-sm mr-3">
                                                    <MapPin className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <span className="line-clamp-1">{customer.address}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-dashed flex justify-between items-center bg-gradient-to-r from-muted/50 to-transparent -mx-6 px-6 pb-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Value</span>
                                        <span className="font-black text-xl text-primary">₹{(customer.total_spent || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex justify-between pt-2">
                                        <span className="flex items-center gap-1 opacity-70">
                                            <Clock className="h-3 w-3" />
                                            Last: {customer.last_order_at ? format(new Date(customer.last_order_at), 'dd MMM yy') : 'N/A'}
                                        </span>
                                        <span className="font-medium">Member since {format(new Date(customer.created_at), 'MMM yyyy')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add Customer Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Add New Customer</DialogTitle>
                        <DialogDescription>
                            Create a new customer profile in your database
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider ml-1">Full Name *</Label>
                            <Input
                                id="name"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                placeholder="e.g. Rahul Sharma"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider ml-1">Phone Number *</Label>
                            <Input
                                id="phone"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                placeholder="10-digit mobile number"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider ml-1">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                placeholder="name@example.com"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider ml-1">Full Address</Label>
                            <Input
                                id="address"
                                value={customerForm.address}
                                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                                placeholder="Street, City, Pincode"
                                className="h-12 rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl h-12 font-bold">
                            Cancel
                        </Button>
                        <Button onClick={handleAddCustomer} className="rounded-xl h-12 px-8 font-bold bg-primary hover:bg-primary shadow-lg shadow-primary/20">
                            Create Customer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

