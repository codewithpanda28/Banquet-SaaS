'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, QrCode, Users, Edit, Trash2, Download } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { RestaurantTable } from '@/types'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function TablesPage() {
    const [tables, setTables] = useState<RestaurantTable[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
    const [tableQRCodes, setTableQRCodes] = useState<Record<string, string>>({})
    const [tableForm, setTableForm] = useState({
        table_number: '',
        table_name: '',
        capacity: '',
        status: 'available' as 'available' | 'occupied' | 'reserved',
    })

    useEffect(() => {
        fetchTables()
    }, [])

    useEffect(() => {
        if (tables.length > 0) {
            generateAllQRCodes()
        }
    }, [tables])

    async function generateAllQRCodes() {
        const codes: Record<string, string> = {}
        for (const table of tables) {
            try {
                // In a real app, this URL would point to your customer-facing menu app
                const qrValue = `${window.location.origin}/customer/menu?restaurantId=${RESTAURANT_ID}&tableId=${table.id}`
                const url = await QRCode.toDataURL(qrValue, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                })
                codes[table.id] = url
            } catch (err) {
                console.error(err)
            }
        }
        setTableQRCodes(codes)
    }

    async function fetchTables() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('table_number')

            if (error) throw error
            setTables(data || [])
        } catch (error) {
            console.error('Error fetching tables:', error)
            toast.error('Failed to load tables')
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveTable() {
        try {
            if (!tableForm.table_number || !tableForm.table_name || !tableForm.capacity) {
                toast.error('Please fill all required fields')
                return
            }

            const tableData = {
                restaurant_id: RESTAURANT_ID,
                table_number: parseInt(tableForm.table_number),
                table_name: tableForm.table_name,
                capacity: parseInt(tableForm.capacity),
                status: tableForm.status,
                is_active: true,
            }

            if (editingTable) {
                const { error } = await supabase
                    .from('restaurant_tables')
                    .update(tableData)
                    .eq('id', editingTable.id)

                if (error) throw error
                toast.success('Table updated successfully')
            } else {
                const { error } = await supabase
                    .from('restaurant_tables')
                    .insert(tableData)

                if (error) throw error
                toast.success('Table added successfully')
            }

            setDialogOpen(false)
            setTableForm({ table_number: '', table_name: '', capacity: '', status: 'available' })
            setEditingTable(null)
            fetchTables()
        } catch (error) {
            console.error('Error saving table:', error)
            toast.error('Failed to save table')
        }
    }

    async function handleDeleteTable(id: string) {
        if (!confirm('Are you sure you want to delete this table?')) return

        try {
            const { error } = await supabase
                .from('restaurant_tables')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Table deleted successfully')
            fetchTables()
        } catch (error) {
            console.error('Error deleting table:', error)
            toast.error('Failed to delete table')
        }
    }

    async function handleToggleStatus(id: string, currentStatus: string) {
        const nextStatus = currentStatus === 'available' ? 'occupied' : 'available'
        try {
            const { error } = await supabase
                .from('restaurant_tables')
                .update({ status: nextStatus })
                .eq('id', id)

            if (error) throw error
            fetchTables()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const downloadQR = (table: RestaurantTable) => {
        const url = tableQRCodes[table.id]
        if (!url) return

        const link = document.createElement('a')
        link.href = url
        link.download = `table-${table.table_number}-qr.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`QR Code for Table ${table.table_number} downloaded`)
    }

    const openEditDialog = (table: RestaurantTable) => {
        setEditingTable(table)
        setTableForm({
            table_number: table.table_number.toString(),
            table_name: table.table_name,
            capacity: table.capacity.toString(),
            status: table.status,
        })
        setDialogOpen(true)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-700 border-green-200'
            case 'occupied': return 'bg-red-100 text-red-700 border-red-200'
            case 'reserved': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-muted-foreground">Loading tables...</div>
            </div>
        )
    }

    const stats = {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tables Management"
                description="Manage your restaurant layout and QR codes"
            >
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Table
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Tables</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Occupied</p>
                        <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Reserved</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.reserved}</p>
                    </CardContent>
                </Card>
            </div>

            {tables.length === 0 ? (
                <Card className="bg-card border-2">
                    <CardContent className="flex h-40 items-center justify-center">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">No tables added yet</p>
                            <Button variant="outline" onClick={() => setDialogOpen(true)}>
                                Add your first table
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tables.map((table) => (
                        <Card key={table.id} className="bg-card border-2 border-muted hover:border-primary/50 transition-all shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                            {table.table_number}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{table.table_name}</CardTitle>
                                            <Badge variant="outline" className={getStatusColor(table.status)}>
                                                {table.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(table)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTable(table.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>Capacity: {table.capacity} Persons</span>
                                </div>

                                <div className="aspect-square bg-muted/50 rounded-lg p-4 flex items-center justify-center relative group">
                                    {tableQRCodes[table.id] ? (
                                        <img src={tableQRCodes[table.id]} alt="QR Code" className="w-full h-full object-contain" />
                                    ) : (
                                        <QrCode className="h-16 w-16 text-muted-foreground opacity-20" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <Button variant="secondary" size="sm" onClick={() => downloadQR(table)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant={table.status === 'available' ? 'default' : 'outline'}
                                        className="w-full"
                                        onClick={() => handleToggleStatus(table.id, table.status)}
                                    >
                                        {table.status === 'available' ? 'Mark Occupied' : 'Mark Available'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => downloadQR(table)}
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        QR
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Table Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                    setEditingTable(null)
                    setTableForm({ table_number: '', table_name: '', capacity: '', status: 'available' })
                }
            }}>
                <DialogContent className="bg-card">
                    <DialogHeader>
                        <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
                        <DialogDescription>
                            Enter table details below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="number">Table Number</Label>
                                <Input
                                    id="number"
                                    type="number"
                                    placeholder="e.g. 1"
                                    value={tableForm.table_number}
                                    onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    placeholder="e.g. 4"
                                    value={tableForm.capacity}
                                    onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Table Name/Location</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Window Side, Booth 1, Terrace"
                                value={tableForm.table_name}
                                onChange={(e) => setTableForm({ ...tableForm, table_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Initial Status</Label>
                            <Select
                                value={tableForm.status}
                                onValueChange={(v: any) => setTableForm({ ...tableForm, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="occupied">Occupied</SelectItem>
                                    <SelectItem value="reserved">Reserved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTable}>
                            {editingTable ? 'Update Table' : 'Create Table'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
