'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Search,
    Download,
    Eye,
    Printer,
    ShoppingBag,
    Utensils,
    Truck,
    Clock,
    MapPin,
    User,
    Calendar,
    ReceiptText,
    CheckCircle2,
    XCircle,
    Wallet,
    Smartphone,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    FilterX,
    Database,
    Archive,
    Trash2,
    DatabaseZap,
    Loader2,
    AlertTriangle,
    UtensilsCrossed
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

// Helper to robustly parse dates primarily from UTC
const parseDate = (dateString: string) => {
    if (!dateString) return new Date()
    if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
        return new Date(dateString + 'Z')
    }
    return new Date(dateString)
}

export default function BillsPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [filteredOrders, setFilteredOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [selectedBills, setSelectedBills] = useState<string[]>([])
    const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
    
    // Archive States
    const [isArchiving, setIsArchiving] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [archivedCount, setArchivedCount] = useState(0)

    useEffect(() => {
        fetchBills()
    }, [dateFilter])

    useEffect(() => {
        filterBills()
    }, [orders, searchTerm])

    async function fetchBills() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers (id, name, phone, email, address),
                    restaurant_tables (table_number),
                    order_items (*)
                `)
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('status', 'completed')
                .gte('created_at', `${dateFilter}T00:00:00`)
                .lte('created_at', `${dateFilter}T23:59:59`)
                .order('created_at', { ascending: false })

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching bills:', error)
            toast.error('Failed to load bits history')
        } finally {
            setLoading(false)
        }
    }

    function filterBills() {
        let filtered = [...orders]
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

    async function handleArchiveAndCleanup() {
        try {
            setIsArchiving(true)
            const sixtyDaysAgo = new Date()
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
            const cutoffDate = sixtyDaysAgo.toISOString()

            // Fetch old completed orders
            const { data: oldOrders, error: fetchErr } = await supabase
                .from('orders')
                .select(`
                    id, 
                    bill_id, 
                    total, 
                    subtotal, 
                    tax, 
                    sgst_amount, 
                    cgst_amount, 
                    payment_method, 
                    status, 
                    created_at, 
                    customer_name,
                    customer_phone,
                    customers (name, phone)
                `)
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('status', 'completed')
                .lte('created_at', cutoffDate)

            if (fetchErr) throw fetchErr

            if (!oldOrders || oldOrders.length === 0) {
                toast.error('No bills older than 60 days found to archive.')
                return
            }

            // CSV Generation with Escaping
            const headers = ['Order ID', 'Customer', 'Phone', 'Items Count', 'Status', 'Date']
            const rows = oldOrders.map((o: any) => {
                const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers
                return [
                    o.bill_id || '',
                    cust?.name || o.customer_name || 'Walk-in',
                    cust?.phone || o.customer_phone || '',
                    o.order_items?.length || 0,
                    o.status || '',
                    format(parseDate(o.created_at), 'dd/MM/yyyy HH:mm')
                ]
            })

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `archived_bills_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            setArchivedCount(oldOrders.length)
            setShowArchiveConfirm(true)
            toast.success(`Exported ${oldOrders.length} records. Check your downloads.`)
        } catch (error) {
            console.error('Archiving error:', error)
            toast.error('Failed to create archive')
        } finally {
            setIsArchiving(false)
        }
    }

    async function handleConfirmPurge() {
        try {
            setIsArchiving(true)
            const sixtyDaysAgo = new Date()
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
            const cutoffDate = sixtyDaysAgo.toISOString()

            const { data: idsToDelete } = await supabase
                .from('orders')
                .select('id')
                .eq('restaurant_id', RESTAURANT_ID)
                .lte('created_at', cutoffDate)
            
            if (!idsToDelete || idsToDelete.length === 0) return
            const ids = idsToDelete.map(o => o.id)

            await supabase.from('order_items').delete().in('order_id', ids)
            const { error: deleteErr } = await supabase.from('orders').delete().in('id', ids)

            if (deleteErr) throw deleteErr

            toast.success(`Cleared ${archivedCount} old records! 🧹`)
            setShowArchiveConfirm(false)
            fetchBills()
        } catch (error) {
            console.error('Purge error:', error)
            toast.error('Cleanup failed')
        } finally {
            setIsArchiving(false)
        }
    }

    const toggleBillSelection = (billId: string) => {
        setSelectedBills(prev => prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId])
    }

    const selectAllBills = () => {
        if (selectedBills.length === filteredOrders.length) {
            setSelectedBills([])
        } else {
            setSelectedBills(filteredOrders.map(o => o.id))
        }
    }

    function handlePrintBills(billsToPrint: any[]) {
        if (billsToPrint.length === 0) return
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            toast.error('Please allow popups to print multiple bills')
            return
        }

        let content = `
            <html>
                <head>
                    <title>Bills Export</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
                        .bill-container { max-width: 300px; margin: 0 auto 50px auto; padding: 20px; border: 1px solid #eee; page-break-after: always; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        h1 { font-size: 18px; margin: 0; }
                        p { margin: 2px 0; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { text-align: left; padding: 4px 0; }
                        .total-section { border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; }
                        .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                        @media print { .bill-container { border: none; } button { display: none; } }
                    </style>
                </head>
                <body>
        `

        billsToPrint.forEach(order => {
            const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers
            content += `
                <div class="bill-container">
                    <div class="header">
                        <h1>RESTAURANT BILL</h1>
                        <p>${order.restaurant_name || 'Restaurant'}</p>
                    </div>
                    <p><strong>Bill ID:</strong> ${order.bill_id}</p>
                    <p><strong>Date:</strong> ${format(parseDate(order.created_at), 'dd/MM/yy hh:mm a')}</p>
                    <p><strong>Customer:</strong> ${customer?.name || 'Walk-in'}</p>
                    ${order.payment_method ? `<p><strong>Paid via:</strong> ${order.payment_method.toUpperCase()}</p>` : ''}
                    <table>
                        <thead><tr><th>Item</th><th style="text-align:right">Qty</th></tr></thead>
                        <tbody>
                            ${order.order_items?.map((item: any) => `
                                <tr>
                                    <td>${item.item_name}</td>
                                    <td style="text-align:right">${item.quantity}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>
                    <div class="total-section">
                    </div>
                    <div class="footer"><p>Thank you for your business!</p></div>
                </div>
            `
        })

        content += `<script>window.print();</script></body></html>`
        printWindow.document.write(content)
        printWindow.document.close()
    }

    const downloadSelected = () => {
        const selectedOrderData = orders.filter(o => selectedBills.includes(o.id))
        handlePrintBills(selectedOrderData)
    }

    const exportToCSV = () => {
        if (filteredOrders.length === 0) {
            toast.error('No data to export')
            return
        }

        const headers = ['Bill ID', 'Customer', 'Phone', 'Amount', 'Tax', 'Payment', 'Time', 'Date']
        const rows = filteredOrders.map(o => {
            const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers
            return [
                o.bill_id || '',
                cust?.name || 'Walk-in',
                cust?.phone || '',
                o.total || '',
                o.tax || 0,
                o.payment_method || '',
                format(parseDate(o.created_at), 'hh:mm a'),
                format(parseDate(o.created_at), 'dd/MM/yyyy')
            ]
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `bill_history_${dateFilter}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Bill history downloaded as CSV!')
    }

    const exportLast60Days = async () => {
        try {
            setLoading(true)
            const sixtyDaysAgo = new Date()
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
            const cutoffDate = sixtyDaysAgo.toISOString()

            const { data: recentOrders, error } = await supabase
                .from('orders')
                .select(`
                    bill_id, 
                    total, 
                    subtotal,
                    tax, 
                    sgst_amount,
                    cgst_amount,
                    payment_method, 
                    created_at, 
                    customer_name,
                    customer_phone,
                    customers (name, phone)
                `)
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('status', 'completed')
                .gte('created_at', cutoffDate)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (!recentOrders || recentOrders.length === 0) {
                toast.error('No bills found in the last 60 days.')
                return
            }

            const headers = ['Bill ID', 'Customer', 'Phone', 'Subtotal', 'SGST', 'CGST', 'Tax', 'Amount', 'Payment', 'Date', 'Time']
            const rows = recentOrders.map((o: any) => {
                const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers
                const date = parseDate(o.created_at)
                return [
                    o.bill_id || '',
                    cust?.name || o.customer_name || 'Guest',
                    cust?.phone || o.customer_phone || '',
                    o.subtotal || o.total,
                    o.sgst_amount || 0,
                    o.cgst_amount || 0,
                    o.tax || 0,
                    o.total || 0,
                    o.payment_method || '',
                    format(date, 'dd/MM/yyyy'),
                    format(date, 'hh:mm a')
                ]
            })

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `last_60_days_bills_${format(new Date(), 'yyyyMMdd')}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success(`Successfully exported ${recentOrders.length} bills from the last 60 days!`)
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Failed to export recent bills')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground font-medium">Fetching Bills...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Bills History" description="View and download closed bills for your records">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2">
                        <Button 
                            onClick={handleArchiveAndCleanup} 
                            disabled={isArchiving}
                            variant="outline"
                            size="sm"
                            className="h-8 border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 text-[10px] font-bold"
                        >
                            {isArchiving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Archive className="mr-2 h-3 w-3" />}
                            Cleanup Old (60d+)
                        </Button>
                        <Button 
                            onClick={exportLast60Days}
                            variant="outline"
                            size="sm"
                            className="h-8 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-bold"
                        >
                            <Download className="mr-2 h-3 w-3" />
                            Export Last 60 Days
                        </Button>
                    </div>
                    <div className="h-16 w-px bg-gray-200 mx-2 self-center" />
                    <div className="flex flex-col gap-2">
                        {selectedBills.length > 0 && (
                            <Button onClick={downloadSelected} size="sm" className="h-8 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold shadow-sm text-[10px]">
                                <Printer className="mr-2 h-3 w-3" />
                                Print Selected ({selectedBills.length})
                            </Button>
                        )}
                    </div>
                    <div className="relative self-center">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input 
                            type="date" 
                            className="pl-10 h-11 bg-white border border-gray-200 rounded-xl"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>
            </PageHeader>

            <Card className="glass-card border-0 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search Order ID, Phone or Name..."
                                className="pl-10 h-11 bg-white border-gray-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span>{filteredOrders.length} Completed Orders</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/30">
                                    <th className="p-4 w-12">
                                        <Checkbox 
                                            checked={selectedBills.length === filteredOrders.length && filteredOrders.length > 0}
                                            onCheckedChange={selectAllBills}
                                            className="rounded-md"
                                        />
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Order ID</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Customer</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Items</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Time</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <ReceiptText className="h-12 w-12" />
                                                <p className="font-medium">No bills found for this date</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => {
                                        const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers
                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="p-4">
                                                    <Checkbox 
                                                        checked={selectedBills.includes(order.id)}
                                                        onCheckedChange={() => toggleBillSelection(order.id)}
                                                        className="rounded-md"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-gray-900 leading-none">{order.bill_id}</span>
                                                    {order.order_type === 'dine_in' && order.restaurant_tables && (
                                                        <p className="text-[10px] text-primary font-bold mt-1 uppercase">Table {order.restaurant_tables.table_number}</p>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{customer?.name || 'Walk-in'}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">{customer?.phone || 'No phone'}</span>
                                                    </div>
                                                </td>
                                                 <td className="p-4">
                                                     <span className="font-bold text-gray-900">{order.order_items?.length || 0}</span>
                                                 </td>
                                                <td className="p-4 text-sm text-gray-500">{format(parseDate(order.created_at), 'hh:mm a')}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedOrder(order)}><Eye className="h-4 w-4 text-gray-500" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handlePrintBills([order])}><Printer className="h-4 w-4" /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl [&>button]:hidden">
                   {selectedOrder && (
                       <div className="bg-white">
                           <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                               <div>
                                   <DialogTitle className="text-xl font-bold text-gray-900 line-clamp-1">Order Details</DialogTitle>
                                   <p className="text-xs text-gray-500">{selectedOrder.bill_id}</p>
                               </div>
                               <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setSelectedOrder(null)}>
                                  <XCircle className="h-10 w-10 text-gray-400" />
                                </Button>
                           </div>
                           <div className="p-6 space-y-6">
                               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                   <div className="flex items-center gap-3 mb-3">
                                       <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                           <User className="h-5 w-5 text-gray-400" />
                                       </div>
                                       <div>
                                           <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Customer Information</p>
                                           <h4 className="font-bold text-gray-900 leading-none mt-1">
                                               {(Array.isArray(selectedOrder.customers) ? selectedOrder.customers[0] : selectedOrder.customers)?.name || selectedOrder.customer_name || 'Walk-in Guest'}
                                           </h4>
                                       </div>
                                   </div>
                                    <div className="grid grid-cols-1 gap-4 text-[11px] font-medium text-gray-500 bg-white/50 p-2 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="h-3 w-3" />
                                            <span>{(Array.isArray(selectedOrder.customers) ? selectedOrder.customers[0] : selectedOrder.customers)?.phone || selectedOrder.customer_phone || 'No phone'}</span>
                                        </div>
                                    </div>
                               </div>

                                <div className="space-y-4">
                                   {selectedOrder.order_items?.map((item: any) => (
                                       <div key={item.id} className="flex justify-between items-center text-sm">
                                           <div className="flex gap-3 items-center"><span className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold">{item.quantity}</span><span>{item.item_name}</span></div>
                                       </div>
                                   ))}
                               </div>
                               <div className="border-t border-dashed border-gray-200 pt-4 space-y-2 text-center">
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banquet Service</p>
                                   <p className="text-xs text-gray-500 italic">Inclusive Guest Experience</p>
                               </div>
                               <Button className="w-full h-12 rounded-xl" onClick={() => handlePrintBills([selectedOrder])}><Printer className="mr-2 h-4 w-4" /> Print Order</Button>
                           </div>
                       </div>
                   )}
                </DialogContent>
            </Dialog>

            {/* Archive Confirm */}
            <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
                <DialogContent className="max-w-md p-8 rounded-[2rem] [&>button]:hidden">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center"><AlertTriangle className="h-10 w-10 text-orange-600" /></div>
                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-black text-gray-900">Archive Downloaded!</DialogTitle>
                            <p className="text-gray-500 font-medium">Exported <span className="text-orange-600 font-bold">{archivedCount}</span> old records.</p>
                            <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-xl font-bold mt-4">IMPORTANT: Would you like to PERMANENTLY remove these records from the live database now?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full pt-4">
                            <Button variant="outline" onClick={() => setShowArchiveConfirm(false)}>Keep in DB</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleConfirmPurge} disabled={isArchiving}>
                                {isArchiving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, Delete Old'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
