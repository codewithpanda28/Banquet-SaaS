'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Store, Utensils, Zap, ImagePlus, Loader2 } from 'lucide-react'
import { supabase, RESTAURANT_ID, getRestaurantId } from '@/lib/supabase'
import { Restaurant } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        primary_color: '#ef4444',
        logo_url: '',
    })
    const [isUploading, setIsUploading] = useState(false)
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
                if (data.dietary_type) setDietaryType(data.dietary_type)
                setForm({
                    name: data.name || '',
                    primary_color: data.primary_color || '#ef4444',
                    logo_url: data.logo_url || '',
                })
            }
        } catch (error) {
            console.error('Error fetching restaurant data:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const rid = getRestaurantId();
            const fileExt = file.name.split('.').pop();
            const fileName = `${rid}-logo-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `restaurants/logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('restaurants')
                .update({ logo_url: publicUrl })
                .eq('id', rid);

            if (dbError) throw dbError;

            setForm(prev => ({ ...prev, logo_url: publicUrl }));
            toast.success('Logo updated!');
        } catch (err: any) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true)
            const { error } = await supabase
                .from('restaurants')
                .update({
                    name: form.name,
                    primary_color: form.primary_color,
                    dietary_type: dietaryType,
                })
                .eq('id', RESTAURANT_ID)

            if (error) throw error
            localStorage.setItem('restaurant_dietary_type', dietaryType)
            toast.success('Settings saved successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <PageHeader title="Settings" description="Manage your banquet profile" />
                <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg rounded-xl hidden md:flex">
                    <Save className="mr-2 h-5 w-5" />
                    {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>

            <div className="grid gap-8 max-w-4xl mx-auto">
                {/* Basic Info */}
                <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Store className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg uppercase italic font-black">Banquet Profile</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Banquet Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 bg-secondary/10 border-white/5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Dietary */}
                <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Utensils className="h-5 w-5 text-green-500" />
                            <CardTitle className="text-lg uppercase italic font-black">Food Preferences</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'veg_only', label: 'Veg Only', color: 'bg-green-600', border: 'border-green-600' },
                                { id: 'non_veg_only', label: 'Non-Veg', color: 'bg-red-600', border: 'border-red-600' },
                                { id: 'both', label: 'Both', color: 'bg-blue-600', border: 'border-blue-600' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setDietaryType(type.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                        dietaryType === type.id ? `${type.border} bg-white/5` : "border-transparent bg-secondary/10"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full", type.color)} />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Zap className="h-5 w-5 text-pink-500" />
                            <CardTitle className="text-lg uppercase italic font-black">Branding & Theme</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-8 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Logo</Label>
                            <div className="relative h-24 w-40 rounded-2xl bg-secondary/10 flex items-center justify-center overflow-hidden border border-white/5 cursor-pointer">
                                {form.logo_url ? <img src={form.logo_url} className="h-full w-full object-contain p-2" /> : <ImagePlus className="opacity-20" />}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white h-4 w-4" /></div>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Theme Color</Label>
                            <div className="flex gap-4 items-center">
                                <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-12 bg-transparent cursor-pointer rounded-xl" />
                                <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-12 bg-secondary/10 font-mono uppercase text-xs" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-lg border-t border-border md:hidden z-50">
                <Button size="lg" onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-black uppercase text-xs shadow-lg">
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
