'use client'

import { useEffect, useState, useRef } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Package, Camera, Upload, AlertTriangle, TrendingDown,
    Plus, Minus, Search, Edit, Trash2, ScanLine, Boxes,
    ShoppingBasket, ArrowDown, ArrowUp, History, Loader2
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { triggerAutomationWebhook } from '@/lib/webhook'
import { format } from 'date-fns'

interface InventoryItem {
    id: string; name: string; category: string; unit: string;
    current_stock: number; min_stock: number; max_stock: number;
    cost_per_unit: number; supplier?: string; last_restocked?: string;
    created_at: string
}

const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Meat', 'Seafood', 'Grains', 'Spices', 'Beverages', 'Packaging', 'Cleaning', 'Other']
const UNITS = ['kg', 'g', 'L', 'ml', 'pieces', 'dozen', 'packets', 'boxes', 'bottles']

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [billScanOpen, setBillScanOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
    const [adjustQty, setAdjustQty] = useState('')
    const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
    const [scanning, setScanning] = useState(false)
    const [scannedText, setScannedText] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const [form, setForm] = useState({
        name: '', category: 'Vegetables', unit: 'kg',
        current_stock: '', min_stock: '', max_stock: '',
        cost_per_unit: '', supplier: ''
    })

    useEffect(() => {
        fetchItems()
        const ch = supabase.channel('inventory-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, fetchItems)
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [])

    async function fetchItems() {
        setLoading(true)
        const { data } = await supabase.from('inventory_items')
            .select('*').eq('restaurant_id', RESTAURANT_ID).order('name')
        setItems(data || [])
        setLoading(false)
    }

    async function saveItem() {
        if (!form.name || !form.current_stock) { toast.error('Name and stock are required'); return }
        const itemData = {
            restaurant_id: RESTAURANT_ID,
            name: form.name, category: form.category, unit: form.unit,
            current_stock: parseFloat(form.current_stock) || 0,
            min_stock: parseFloat(form.min_stock) || 0,
            max_stock: parseFloat(form.max_stock) || 999,
            cost_per_unit: parseFloat(form.cost_per_unit) || 0,
            supplier: form.supplier || null,
            last_restocked: new Date().toISOString()
        }
        const { error } = editingItem
            ? await supabase.from('inventory_items').update(itemData).eq('id', editingItem.id)
            : await supabase.from('inventory_items').insert(itemData)
        if (error) { toast.error('Failed to save item'); return }
        toast.success(editingItem ? 'Item updated!' : 'Item added!')
        setDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchItems()
    }

    async function adjustStock() {
        if (!adjustItem || !adjustQty) return
        const qty = parseFloat(adjustQty)
        const newStock = adjustType === 'add'
            ? adjustItem.current_stock + qty
            : Math.max(0, adjustItem.current_stock - qty)

        const { error } = await supabase.from('inventory_items')
            .update({ current_stock: newStock, last_restocked: adjustType === 'add' ? new Date().toISOString() : adjustItem.last_restocked })
            .eq('id', adjustItem.id)

        if (error) toast.error('Failed to adjust stock')
        else {
            toast.success(`Stock ${adjustType === 'add' ? 'added' : 'reduced'}!`)

            // TRIGGER WEBHOOK
            await triggerAutomationWebhook('add-stock', {
                action: 'add-stock',
                items: [{
                    name: adjustItem.name,
                    quantity: qty,
                    unit: adjustItem.unit,
                    cost: adjustItem.cost_per_unit * qty
                }],
                item_id: adjustItem.id,
                type: adjustType,
                new_stock: newStock,
                restaurant_id: RESTAURANT_ID
            })

            setAdjustItem(null)
            setAdjustQty('')
            fetchItems()
        }
    }

    async function deleteItem(id: string) {
        if (!confirm('Delete this inventory item?')) return
        await supabase.from('inventory_items').delete().eq('id', id)
        toast.success('Item deleted')
        fetchItems()
    }

    function resetForm() {
        setForm({ name: '', category: 'Vegetables', unit: 'kg', current_stock: '', min_stock: '', max_stock: '', cost_per_unit: '', supplier: '' })
    }

    const [parsedItems, setParsedItems] = useState<{ name: string, qty: number, unit: string, price: number }[]>([])

    async function handleBillPhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setScanning(true)
        setScannedText('')
        setParsedItems([])
        toast.info('AI is analyzing your bill...')

        // 1. Trigger Automation (Log only for now)
        await triggerAutomationWebhook('inventory-upload', {
            file_name: file.name,
            file_type: file.type,
            restaurant_id: RESTAURANT_ID,
            timestamp: new Date().toISOString()
        })

        // 2. Simulated AI Result (In production, replace with real OCR data)
        const mockItems = [
            { name: 'Tomatoes', qty: 5, unit: 'kg', price: 40 },
            { name: 'Onions', qty: 10, unit: 'kg', price: 30 },
            { name: 'Cooking Oil', qty: 5, unit: 'L', price: 120 },
            { name: 'Garam Masala', qty: 1, unit: 'kg', price: 400 },
        ]

        setTimeout(() => {
            setParsedItems(mockItems)
            setScannedText(`Extracted ${mockItems.length} items from bill.`)
            setScanning(false)
            toast.success('Bill scanned successfully!')
        }, 1500)
    }

    async function applyScannedBill() {
        if (parsedItems.length === 0) return
        setLoading(true)
        let updatedCount = 0

        try {
            for (const item of parsedItems) {
                // Check if item exists
                const { data: existing } = await supabase
                    .from('inventory_items')
                    .select('*')
                    .eq('name', item.name)
                    .eq('restaurant_id', RESTAURANT_ID)
                    .maybeSingle()

                if (existing) {
                    // Update stock
                    await supabase.from('inventory_items')
                        .update({
                            current_stock: existing.current_stock + item.qty,
                            cost_per_unit: item.price,
                            last_restocked: new Date().toISOString()
                        })
                        .eq('id', existing.id)
                } else {
                    // Create new
                    await supabase.from('inventory_items').insert({
                        restaurant_id: RESTAURANT_ID,
                        name: item.name,
                        category: 'Other',
                        unit: item.unit,
                        current_stock: item.qty,
                        min_stock: 2,
                        max_stock: 50,
                        cost_per_unit: item.price,
                        last_restocked: new Date().toISOString()
                    })
                }
                updatedCount++
            }

            toast.success(`Successfully updated ${updatedCount} items in inventory!`)
            setBillScanOpen(false)
            setParsedItems([])
            fetchItems()
        } catch (err) {
            toast.error('Failed to update inventory')
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
        const matchCat = category === 'all' || item.category === category
        return matchSearch && matchCat
    })

    const lowStockItems = items.filter(i => i.current_stock <= i.min_stock)
    const totalValue = items.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0)

    const stockLevel = (item: InventoryItem) => {
        if (item.current_stock <= item.min_stock) return 'low'
        if (item.current_stock >= item.max_stock * 0.8) return 'high'
        return 'ok'
    }

    if (loading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Loading Inventory...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Inventory Management" description="Track stock levels — scan bills to auto-update">
                <div className="flex gap-2">
                    <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setBillScanOpen(true)}>
                        <ScanLine className="h-4 w-4 mr-2" /> Scan Bill
                    </Button>
                    <Button className="bg-primary text-white font-bold" onClick={() => { resetForm(); setEditingItem(null); setDialogOpen(true) }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                </div>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total SKUs', value: items.length, bg: 'bg-blue-50', color: 'text-blue-700' },
                    { label: 'Low Stock Alerts', value: lowStockItems.length, bg: 'bg-red-50', color: 'text-red-700' },
                    { label: 'Inventory Value', value: `₹${totalValue.toLocaleString()}`, bg: 'bg-green-50', color: 'text-green-700' },
                    { label: 'Categories', value: [...new Set(items.map(i => i.category))].length, bg: 'bg-purple-50', color: 'text-purple-700' },
                ].map(s => (
                    <Card key={s.label} className={cn('border-0', s.bg)}>
                        <CardContent className="p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Low Stock Banner */}
            {lowStockItems.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-700 text-sm">Low Stock Alert!</p>
                        <p className="text-xs text-red-600 mt-0.5">
                            {lowStockItems.map(i => `${i.name} (${i.current_stock} ${i.unit})`).join(' • ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-10 h-10 w-64" />
                </div>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-44 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Inventory Grid */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Boxes className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No inventory items found</p>
                    <Button variant="link" className="text-primary mt-2" onClick={() => { resetForm(); setDialogOpen(true) }}>Add your first item</Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map(item => {
                        const level = stockLevel(item)
                        const pct = item.max_stock > 0 ? Math.min(100, (item.current_stock / item.max_stock) * 100) : 0
                        return (
                            <Card key={item.id} className={cn(
                                'border-2 shadow-sm transition-all hover:shadow-md',
                                level === 'low' ? 'border-red-200' : 'border-gray-100'
                            )}>
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900">{item.name}</h3>
                                                {level === 'low' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                                            </div>
                                            <Badge className={cn('mt-1 text-[10px] border-0',
                                                level === 'low' ? 'bg-red-100 text-red-700' :
                                                    level === 'ok' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            )}>{item.category}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                                setEditingItem(item)
                                                setForm({ name: item.name, category: item.category, unit: item.unit, current_stock: String(item.current_stock), min_stock: String(item.min_stock), max_stock: String(item.max_stock), cost_per_unit: String(item.cost_per_unit), supplier: item.supplier || '' })
                                                setDialogOpen(true)
                                            }}><Edit className="h-3.5 w-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => deleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Stock</span>
                                            <span className={cn('font-bold', level === 'low' ? 'text-red-600' : 'text-gray-900')}>
                                                {item.current_stock} {item.unit}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={cn('h-full rounded-full transition-all',
                                                level === 'low' ? 'bg-red-500' : level === 'ok' ? 'bg-green-500' : 'bg-blue-500'
                                            )} style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-400">
                                            <span>Min: {item.min_stock}</span>
                                            <span>Max: {item.max_stock}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                                        <span>₹{item.cost_per_unit}/{item.unit}</span>
                                        {item.last_restocked && <span>Last: {format(new Date(item.last_restocked), 'MMM d')}</span>}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 h-8 bg-green-600 text-white text-xs" onClick={() => { setAdjustItem(item); setAdjustType('add'); setAdjustQty('') }}>
                                            <ArrowUp className="h-3 w-3 mr-1" /> Add Stock
                                        </Button>
                                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-200 text-red-600" onClick={() => { setAdjustItem(item); setAdjustType('subtract'); setAdjustQty('') }}>
                                            <ArrowDown className="h-3 w-3 mr-1" /> Use
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl max-h-[95vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{editingItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 overflow-y-auto pr-1 flex-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Item Name *</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tomatoes" className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Category</Label>
                                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Unit</Label>
                                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Current Stock *</Label>
                                <Input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} placeholder="0" className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Cost per Unit (₹)</Label>
                                <Input type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} placeholder="0" className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Min Stock (Alert)</Label>
                                <Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} placeholder="0" className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Max Stock</Label>
                                <Input type="number" value={form.max_stock} onChange={e => setForm({ ...form, max_stock: e.target.value })} placeholder="999" className="h-10" />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Supplier (Optional)</Label>
                                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" className="h-10" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-primary text-white font-bold" onClick={saveItem}>Save Item</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Adjust Stock Dialog */}
            <Dialog open={!!adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)}>
                <DialogContent className="sm:max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {adjustType === 'add' ? <ArrowUp className="h-5 w-5 text-green-500" /> : <ArrowDown className="h-5 w-5 text-red-500" />}
                            {adjustType === 'add' ? 'Add Stock' : 'Use Stock'}
                        </DialogTitle>
                    </DialogHeader>
                    {adjustItem && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="font-bold text-gray-900">{adjustItem.name}</p>
                                <p className="text-sm text-gray-500">Current: {adjustItem.current_stock} {adjustItem.unit}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Quantity ({adjustItem.unit})</Label>
                                <Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="0" className="h-10 text-lg font-bold text-center" />
                            </div>
                            {adjustQty && (
                                <div className="p-3 rounded-xl bg-blue-50 text-sm text-blue-700 text-center font-medium">
                                    New stock: {adjustType === 'add'
                                        ? adjustItem.current_stock + parseFloat(adjustQty || '0')
                                        : Math.max(0, adjustItem.current_stock - parseFloat(adjustQty || '0'))
                                    } {adjustItem.unit}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAdjustItem(null)}>Cancel</Button>
                        <Button className={cn('font-bold', adjustType === 'add' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')} onClick={adjustStock}>
                            {adjustType === 'add' ? 'Add Stock' : 'Confirm Use'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bill Scan Dialog */}
            <Dialog open={billScanOpen} onOpenChange={setBillScanOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
                    <DialogHeader className="p-6 pb-2 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-primary" /> Scan Supplier Bill
                        </DialogTitle>
                        <DialogDescription>Click a photo of your supplier bill — AI will extract items and auto-update stock</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-2">
                        <div className="space-y-4 pb-4">
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-primary/30 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                            >
                                <Camera className="h-10 w-10 mx-auto text-primary/40 mb-3" />
                                <p className="font-semibold text-gray-600">Click to upload bill photo</p>
                                <p className="text-xs text-gray-400 mt-1">JPG, PNG supported — AI will extract items</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBillPhoto} />

                            {scanning && (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl animate-pulse">
                                    <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                    <p className="text-blue-700 font-medium text-sm">AI scanning bill...</p>
                                </div>
                            )}

                            {scannedText && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase text-gray-400">Extracted Items</Label>
                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">AI CONFIRMED</Badge>
                                    </div>

                                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-inner">
                                        {parsedItems.map((item, idx) => (
                                            <div key={idx} className={cn(
                                                "flex items-center justify-between p-4 transition-colors hover:bg-white/50",
                                                idx !== parsedItems.length - 1 && "border-b border-gray-100"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100 font-bold text-xs text-primary shadow-sm">
                                                        {item.qty}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{item.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.unit} • ₹{item.price}/{item.unit}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-sm text-gray-900">₹{item.qty * item.price}</p>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                            <span className="text-[10px] font-bold uppercase opacity-60">Grand Total</span>
                                            <span className="font-black text-orange-400 text-lg">₹{parsedItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0)}</span>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl shadow-green-500/20 transition-all active:scale-95 group"
                                        onClick={applyScannedBill}
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <History className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />}
                                        Sync with Inventory
                                    </Button>

                                    <p className="text-[10px] text-center text-gray-400 font-medium italic">Clicking sync will update your real-time stock levels.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 shrink-0 border-t bg-gray-50/50">
                        <Button variant="outline" className="w-full rounded-xl border-gray-200" onClick={() => { setBillScanOpen(false); setScannedText(''); setParsedItems([]) }}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
