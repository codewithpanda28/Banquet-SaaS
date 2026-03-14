'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    CalendarCheck, Armchair, Clock, Users, Phone, User,
    CheckCircle2, XCircle, Calendar, Plus, Trash2, Mail, Search
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, addDays, startOfDay, isToday, isTomorrow } from 'date-fns'

interface Table { id: string; table_number: number; table_name: string; capacity: number; status: string }
interface Booking {
    id: string; table_id: string; customer_name: string; customer_phone: string; customer_email?: string;
    party_size: number; booking_date: string; booking_time: string; status: string; notes?: string;
    restaurant_tables?: { table_number: number; table_name: string; capacity: number }
}

const TIME_SLOTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00']

export default function TableBookingPage() {
    const [tables, setTables] = useState<Table[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [selectedTime, setSelectedTime] = useState('')
    const [search, setSearch] = useState('')
    const [form, setForm] = useState({
        customer_name: '', customer_phone: '', customer_email: '',
        party_size: '2', table_id: '', booking_date: format(new Date(), 'yyyy-MM-dd'),
        booking_time: '', notes: ''
    })

    useEffect(() => {
        fetchAll()
        const ch = supabase.channel('bookings-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'table_bookings' }, fetchAll)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, fetchAll)
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [])

    async function fetchAll() {
        setLoading(true)
        const today = startOfDay(new Date()).toISOString()
        const [{ data: tablesData }, { data: bookingsData }] = await Promise.all([
            supabase.from('restaurant_tables').select('*').eq('restaurant_id', RESTAURANT_ID).order('table_number'),
            supabase.from('table_bookings').select('*, restaurant_tables(table_number, table_name, capacity)')
                .eq('restaurant_id', RESTAURANT_ID).gte('booking_date', today.split('T')[0]).order('booking_date').order('booking_time')
        ])
        setTables(tablesData || [])
        setBookings(bookingsData || [])
        setLoading(false)
    }

    // Get occupied table IDs for a given date+time slot
    function getOccupiedTableIds(date: string, time: string) {
        return bookings
            .filter(b => b.booking_date === date && b.booking_time === time && b.status !== 'cancelled')
            .map(b => b.table_id)
    }

    const availableTablesForSlot = (date: string, time: string) => {
        const occupied = getOccupiedTableIds(date, time)
        // If booking is for today, we check physical status too
        const isSelectedToday = date === format(new Date(), 'yyyy-MM-dd')
        
        return tables.filter(t => {
            const isReservedByBooking = occupied.includes(t.id)
            // For today's bookings, we also consider if the table is physically occupied right now
            // This prevents double-booking a table that currently has a long-sitting client
            const isPhysicallyBusy = isSelectedToday && t.status === 'occupied'
            
            return !isReservedByBooking && !isPhysicallyBusy
        })
    }

    async function handleBook() {
        if (!form.customer_name || !form.customer_phone || !form.table_id || !form.booking_date || !form.booking_time) {
            toast.error('Please fill all required fields')
            return
        }
        try {
            const { error } = await supabase.from('table_bookings').insert({
                restaurant_id: RESTAURANT_ID,
                table_id: form.table_id,
                customer_name: form.customer_name,
                customer_phone: form.customer_phone,
                customer_email: form.customer_email || null,
                party_size: parseInt(form.party_size),
                booking_date: form.booking_date,
                booking_time: form.booking_time,
                notes: form.notes || null,
                status: 'confirmed'
            })
            if (error) throw error
            toast.success('Table booked successfully! ✅')
            setDialogOpen(false)
            setForm({ customer_name: '', customer_phone: '', customer_email: '', party_size: '2', table_id: '', booking_date: format(new Date(), 'yyyy-MM-dd'), booking_time: '', notes: '' })
            fetchAll()
        } catch (err: any) {
            toast.error('Booking failed: ' + err.message)
        }
    }

    async function cancelBooking(id: string) {
        if (!confirm('Cancel this booking?')) return
        const { error } = await supabase.from('table_bookings').update({ status: 'cancelled' }).eq('id', id)
        if (error) toast.error('Failed to cancel')
        else { toast.success('Booking cancelled'); fetchAll() }
    }

    async function markSeated(id: string, tableId: string) {
        await supabase.from('table_bookings').update({ status: 'seated' }).eq('id', id)
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId)
        toast.success('Customer seated!')
        fetchAll()
    }

    const filteredBookings = bookings.filter(b =>
        b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.customer_phone?.includes(search)
    )

    const todayBookings = filteredBookings.filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd'))
    const upcomingBookings = filteredBookings.filter(b => b.booking_date > format(new Date(), 'yyyy-MM-dd'))

    const statusColor = (s: string) => s === 'confirmed' ? 'bg-blue-100 text-blue-700' : s === 'seated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'

    if (loading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Loading Bookings...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Table Booking System" description="Smart table availability — only show free tables">
                <Button className="bg-primary text-white font-bold" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Booking
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Today's Bookings", value: todayBookings.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Seated Now', value: bookings.filter(b => b.status === 'seated').length, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Available Tables', value: tables.filter(t => t.status === 'available').length, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map(s => (
                    <Card key={s.label} className={cn('border-0', s.bg)}>
                        <CardContent className="p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                            <p className={cn('text-3xl font-black mt-1', s.color)}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Availability Visual - Table Grid */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Armchair className="h-4 w-4 text-primary" /> Live Table Status
                    </CardTitle>
                    <CardDescription>Real-time availability for today</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {tables.map(table => {
                            const tableBookingsToday = bookings.filter(b => b.table_id === table.id && b.booking_date === format(new Date(), 'yyyy-MM-dd') && b.status !== 'cancelled')
                            return (
                                <div key={table.id} className={cn(
                                    'rounded-xl border-2 p-4 transition-all',
                                    table.status === 'occupied' ? 'border-red-200 bg-red-50' :
                                        tableBookingsToday.length > 0 ? 'border-yellow-200 bg-yellow-50' :
                                            'border-green-200 bg-green-50'
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="text-xl font-black text-gray-900">T{table.table_number}</div>
                                        <div className={cn('h-2.5 w-2.5 rounded-full mt-1',
                                            table.status === 'occupied' ? 'bg-red-500' :
                                                tableBookingsToday.length > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'
                                        )} />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{table.table_name}</div>
                                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                        <Users className="h-3 w-3" /> {table.capacity}
                                    </div>
                                    <div className="mt-2">
                                        {table.status === 'occupied' ? (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">OCCUPIED</span>
                                        ) : tableBookingsToday.length > 0 ? (
                                            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">{tableBookingsToday.length} BOOKING{tableBookingsToday.length > 1 ? 'S' : ''}</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">FREE</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Bookings List */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <CardTitle className="text-base">Upcoming Bookings</CardTitle>
                        <CardDescription>{bookings.filter(b => b.status !== 'cancelled').length} active reservations</CardDescription>
                    </div>
                    <div className="relative w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..." className="pl-10 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {todayBookings.length === 0 && upcomingBookings.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>No upcoming bookings</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {todayBookings.length > 0 && (
                                <div className="px-4 py-2 bg-green-50 text-xs font-bold text-green-700 uppercase tracking-wider">Today</div>
                            )}
                            {todayBookings.map(b => (
                                <BookingRow key={b.id} booking={b} onCancel={cancelBooking} onSeated={markSeated} statusColor={statusColor} />
                            ))}
                            {upcomingBookings.length > 0 && (
                                <div className="px-4 py-2 bg-blue-50 text-xs font-bold text-blue-700 uppercase tracking-wider">Upcoming</div>
                            )}
                            {upcomingBookings.map(b => (
                                <BookingRow key={b.id} booking={b} onCancel={cancelBooking} onSeated={markSeated} statusColor={statusColor} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* New Booking Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5 text-primary" /> New Table Reservation
                        </DialogTitle>
                        <DialogDescription>Only available tables will be shown for the selected time slot</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Date *</Label>
                                <Input type="date" value={form.booking_date}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                                    onChange={e => setForm({ ...form, booking_date: e.target.value, table_id: '' })}
                                    className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Time Slot *</Label>
                                <Select value={form.booking_time} onValueChange={v => setForm({ ...form, booking_time: v, table_id: '' })}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Select time" /></SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map(t => (
                                            <SelectItem key={t} value={t}>
                                                {t} — {availableTablesForSlot(form.booking_date, t).length} tables free
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {form.booking_time && (
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">
                                    Available Table * ({availableTablesForSlot(form.booking_date, form.booking_time).length} free)
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableTablesForSlot(form.booking_date, form.booking_time).length === 0 ? (
                                        <div className="col-span-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                                            ❌ No tables available at this time slot
                                        </div>
                                    ) : availableTablesForSlot(form.booking_date, form.booking_time).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setForm({ ...form, table_id: t.id })}
                                            className={cn('p-3 rounded-xl border-2 text-left transition-all',
                                                form.table_id === t.id ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary/40'
                                            )}
                                        >
                                            <div className="font-black text-gray-900">T{t.table_number}</div>
                                            <div className="text-xs text-gray-500">{t.table_name}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Users className="h-3 w-3" />{t.capacity}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Customer Name *</Label>
                                <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Rahul Sharma" className="h-10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-gray-400">Party Size</Label>
                                <Select value={form.party_size} onValueChange={v => setForm({ ...form, party_size: v })}>
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(n => <SelectItem key={n} value={String(n)}>{n} person{n > 1 ? 's' : ''}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-gray-400">Phone *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="9876543210" className="pl-10 h-10" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-gray-400">Email (Optional)</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} placeholder="email@example.com" type="email" className="pl-10 h-10" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-gray-400">Special Notes</Label>
                            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Birthday, anniversary, dietary needs..." className="h-10" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-primary text-white font-bold" onClick={handleBook}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function BookingRow({ booking, onCancel, onSeated, statusColor }: {
    booking: Booking; onCancel: (id: string) => void; onSeated: (id: string, tableId: string) => void;
    statusColor: (s: string) => string
}) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-black text-sm">T{booking.restaurant_tables?.table_number}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{booking.customer_name}</p>
                    <Badge className={cn('border-0 text-[10px]', statusColor(booking.status))}>{booking.status}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{booking.customer_phone}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{booking.party_size}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.booking_date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.booking_time}</span>
                </div>
            </div>
            <div className="flex gap-2 shrink-0">
                {booking.status === 'confirmed' && (
                    <Button size="sm" className="bg-green-600 text-white text-xs h-8" onClick={() => onSeated(booking.id, booking.table_id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Seat
                    </Button>
                )}
                {booking.status !== 'cancelled' && booking.status !== 'seated' && (
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 text-xs h-8" onClick={() => onCancel(booking.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                )}
            </div>
        </div>
    )
}
