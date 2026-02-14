'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Store, Clock, DollarSign, Phone, Mail, MapPin } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Restaurant } from '@/types'
import { toast } from 'sonner'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [form, setForm] = useState({
        name: '',
        tagline: '',
        phone: '',
        whatsapp_number: '',
        email: '',
        address: '',
        city: '',
        tax_percentage: '',
        delivery_charge: '',
        min_order_amount: '',
        avg_preparation_time: '',
        opening_time: '',
        closing_time: '',
        upi_id: '',
    })

    useEffect(() => {
        fetchRestaurantData()
    }, [])

    async function fetchRestaurantData() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', RESTAURANT_ID)
                .single()

            if (error) throw error

            if (data) {
                setRestaurant(data)
                setForm({
                    name: data.name || '',
                    tagline: data.tagline || '',
                    phone: data.phone || '',
                    whatsapp_number: data.whatsapp_number || '',
                    email: data.email || '',
                    address: data.address || '',
                    city: data.city || '',
                    tax_percentage: data.tax_percentage?.toString() || '',
                    delivery_charge: data.delivery_charge?.toString() || '',
                    min_order_amount: data.min_order_amount?.toString() || '',
                    avg_preparation_time: data.avg_preparation_time?.toString() || '',
                    opening_time: data.opening_time || '',
                    closing_time: data.closing_time || '',
                    upi_id: data.upi_id || '',
                })
            }
        } catch (error) {
            console.error('Error fetching restaurant data:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setSaving(true)

            const updateData = {
                name: form.name,
                tagline: form.tagline || null,
                phone: form.phone,
                whatsapp_number: form.whatsapp_number || null,
                email: form.email || null,
                address: form.address,
                city: form.city,
                tax_percentage: parseFloat(form.tax_percentage) || 0,
                delivery_charge: parseFloat(form.delivery_charge) || 0,
                min_order_amount: parseFloat(form.min_order_amount) || 0,
                avg_preparation_time: parseInt(form.avg_preparation_time) || 15,
                opening_time: form.opening_time || null,
                closing_time: form.closing_time || null,
                upi_id: form.upi_id || null,
            }

            const { error } = await supabase
                .from('restaurants')
                .update(updateData)
                .eq('id', RESTAURANT_ID)

            if (error) throw error

            toast.success('Settings saved successfully')
            fetchRestaurantData()
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-muted-foreground">Loading settings...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Settings"
                description="Configure restaurant settings"
            >
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </PageHeader>

            <div className="grid gap-6">
                {/* General Information */}
                <Card className="bg-card border-2 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-primary" />
                            <CardTitle>General Information</CardTitle>
                        </div>
                        <CardDescription>Basic details about your restaurant</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Restaurant Name</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tagline">Tagline</Label>
                            <Input
                                id="tagline"
                                value={form.tagline}
                                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact & Location */}
                <Card className="bg-card border-2 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <CardTitle>Contact & Location</CardTitle>
                        </div>
                        <CardDescription>How customers can reach you</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    className="pl-10"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp Number</Label>
                            <Input
                                id="whatsapp"
                                value={form.whatsapp_number}
                                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    className="pl-10"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Textarea
                                id="address"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Operating Hours */}
                    <Card className="bg-card border-2 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                <CardTitle>Operating Hours</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="opening">Opening Time</Label>
                                    <Input
                                        id="opening"
                                        type="time"
                                        value={form.opening_time}
                                        onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="closing">Closing Time</Label>
                                    <Input
                                        id="closing"
                                        type="time"
                                        value={form.closing_time}
                                        onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prep-time">Avg Preparation Time (mins)</Label>
                                <Input
                                    id="prep-time"
                                    type="number"
                                    value={form.avg_preparation_time}
                                    onChange={(e) => setForm({ ...form, avg_preparation_time: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing & Tax */}
                    <Card className="bg-card border-2 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                <CardTitle>Pricing & Tax</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tax">Tax (%)</Label>
                                    <Input
                                        id="tax"
                                        type="number"
                                        value={form.tax_percentage}
                                        onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delivery">Delivery Charge (₹)</Label>
                                    <Input
                                        id="delivery"
                                        type="number"
                                        value={form.delivery_charge}
                                        onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-order">Min Order Amount (₹)</Label>
                                <Input
                                    id="min-order"
                                    type="number"
                                    value={form.min_order_amount}
                                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Information */}
                <Card className="bg-card border-2 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <CardTitle>Payment Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="upi">UPI ID for Payments</Label>
                            <Input
                                id="upi"
                                placeholder="merchant@upi"
                                value={form.upi_id}
                                onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Used for generating payment links and QR codes.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-6">
                <Button size="lg" onClick={handleSave} disabled={saving} className="px-8">
                    <Save className="mr-2 h-5 w-5" />
                    {saving ? 'Saving...' : 'Save All Settings'}
                </Button>
            </div>
        </div>
    )
}
