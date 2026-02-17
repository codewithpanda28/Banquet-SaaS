'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Store, Clock, DollarSign, Phone, Mail, MapPin, Smartphone, Utensils } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Restaurant } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    const [dietaryType, setDietaryType] = useState('both')

    useEffect(() => {
        fetchRestaurantData()
        const storedDietary = localStorage.getItem('restaurant_dietary_type')
        if (storedDietary) setDietaryType(storedDietary)
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

            localStorage.setItem('restaurant_dietary_type', dietaryType)
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
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Preferences...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="System Settings"
                    description="Configure your restaurant's profile and operations"
                />
                <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all px-8 h-12 rounded-xl hidden md:flex">
                    <Save className="mr-2 h-5 w-5" />
                    {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>

            <div className="grid gap-8 max-w-5xl mx-auto">
                {/* General Information */}
                <Card className="glass-panel border-0 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Store className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Restaurant Profile</CardTitle>
                                <CardDescription>Basic information displayed to customers</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Restaurant Name</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="bg-secondary/20 border-border/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tagline" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tagline / Slogan</Label>
                            <Input
                                id="tagline"
                                value={form.tagline}
                                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                                className="bg-secondary/20 border-border/50 h-11"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact & Location */}
                <Card className="glass-panel border-0 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Location & Contact</CardTitle>
                                <CardDescription>Address and communication details</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp Business</Label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="whatsapp"
                                    value={form.whatsapp_number}
                                    onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="city"
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    className="pl-10 bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Address</Label>
                            <Textarea
                                id="address"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="bg-secondary/20 border-border/50 resize-none min-h-[80px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Operating Hours */}
                    <Card className="glass-panel border-0 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Operations</CardTitle>
                                    <CardDescription>Timings and preparation</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="opening" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opening</Label>
                                    <Input
                                        id="opening"
                                        type="time"
                                        value={form.opening_time}
                                        onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                                        className="bg-secondary/20 border-border/50 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="closing" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Closing</Label>
                                    <Input
                                        id="closing"
                                        type="time"
                                        value={form.closing_time}
                                        onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                                        className="bg-secondary/20 border-border/50 h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prep-time" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Prep Time (mins)</Label>
                                <Input
                                    id="prep-time"
                                    type="number"
                                    value={form.avg_preparation_time}
                                    onChange={(e) => setForm({ ...form, avg_preparation_time: e.target.value })}
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing & Tax */}
                    <Card className="glass-panel border-0 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Finance</CardTitle>
                                    <CardDescription>Pricing, taxes and fees</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tax" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tax (%)</Label>
                                    <Input
                                        id="tax"
                                        type="number"
                                        value={form.tax_percentage}
                                        onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                                        className="bg-secondary/20 border-border/50 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delivery" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery Charge (₹)</Label>
                                    <Input
                                        id="delivery"
                                        type="number"
                                        value={form.delivery_charge}
                                        onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })}
                                        className="bg-secondary/20 border-border/50 h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-order" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Order Value (₹)</Label>
                                <Input
                                    id="min-order"
                                    type="number"
                                    value={form.min_order_amount}
                                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Information */}
                <Card className="glass-panel border-0 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Digital Payments</CardTitle>
                                <CardDescription>UPI configurations</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="upi" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">UPI ID (Merchant VPA)</Label>
                            <Input
                                id="upi"
                                placeholder="merchant@upi"
                                value={form.upi_id}
                                onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                                className="bg-secondary/20 border-border/50 h-11 font-mono"
                            />
                            <p className="text-xs text-muted-foreground mt-1">This VPA will be encoded in QR codes for direct payments.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Dietary Configuration */}
                <Card className="glass-panel border-0 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <Utensils className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Dietary Configuration</CardTitle>
                                <CardDescription>Set your restaurant's dietary restrictions</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-w-md">
                            <div className="flex flex-col gap-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Restaurant Type</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setDietaryType('veg_only')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                                            dietaryType === 'veg_only'
                                                ? "border-green-500 bg-green-50 text-green-700 font-bold"
                                                : "border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground"
                                        )}
                                    >
                                        <div className="w-4 h-4 border border-green-600 bg-green-600 rounded-full" />
                                        <span className="text-xs">Veg Only</span>
                                    </button>
                                    <button
                                        onClick={() => setDietaryType('non_veg_only')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                                            dietaryType === 'non_veg_only'
                                                ? "border-red-500 bg-red-50 text-red-700 font-bold"
                                                : "border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground"
                                        )}
                                    >
                                        <div className="w-4 h-4 border border-red-600 bg-red-600 rounded-full" />
                                        <span className="text-xs">Non-Veg Only</span>
                                    </button>
                                    <button
                                        onClick={() => setDietaryType('both')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                                            dietaryType === 'both'
                                                ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                                                : "border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground"
                                        )}
                                    >
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 border border-green-600 bg-green-600 rounded-full" />
                                            <div className="w-2 h-2 border border-red-600 bg-red-600 rounded-full" />
                                        </div>
                                        <span className="text-xs">Both</span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This setting restricts what kind of items can be added to the menu.
                                {dietaryType === 'veg_only' && <span className="text-green-600 font-bold block mt-1">Only Vegetarian items can be added.</span>}
                                {dietaryType === 'non_veg_only' && <span className="text-red-600 font-bold block mt-1">Only Non-Vegetarian items can be added.</span>}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Save Button */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-lg border-t border-border mt-8 md:hidden z-50">
                <Button size="lg" onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-bold shadow-lg">
                    <Save className="mr-2 h-5 w-5" />
                    {saving ? 'Saving...' : 'Save All Settings'}
                </Button>
            </div>
        </div>
    )
}
