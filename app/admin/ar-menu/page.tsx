'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Smartphone, Eye, QrCode, Camera, Layers, Box,
    Upload, Star, ExternalLink, Info, Image, Zap, Globe
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import QRCode from 'qrcode'

interface MenuItem { id: string; name: string; price: number; is_veg: boolean; image_url?: string; description?: string; is_bestseller?: boolean; ar_model_url?: string; ar_enabled?: boolean }

export default function ARMenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [arDialogOpen, setArDialogOpen] = useState(false)
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
    const [modelUrl, setModelUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [previewItem, setPreviewItem] = useState<MenuItem | null>(null)

    useEffect(() => {
        fetchItems()
    }, [])

    async function fetchItems() {
        setLoading(true)
        const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', RESTAURANT_ID).eq('is_available', true)
        const items = (data || []).filter((i: MenuItem) => !i.name.startsWith('[DELETED]'))
        setMenuItems(items)
        generateQRCodes(items)
        setLoading(false)
    }

    async function generateQRCodes(items: MenuItem[]) {
        const codes: Record<string, string> = {}
        for (const item of items.slice(0, 20)) {
            try {
                const arUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/ar/menu/${item.id}`
                codes[item.id] = await QRCode.toDataURL(arUrl, { width: 200, margin: 1 })
            } catch { }
        }
        setQrCodes(codes)
    }

    async function saveARModel() {
        if (!selectedItem || !modelUrl) { toast.error('Please enter a model URL'); return }
        setSaving(true)
        const { error } = await supabase.from('menu_items').update({
            ar_model_url: modelUrl,
            ar_enabled: true
        }).eq('id', selectedItem.id)
        setSaving(false)
        if (error) toast.error('Failed to save')
        else {
            toast.success('AR model linked!')
            setArDialogOpen(false)
            fetchItems()
        }
    }

    async function toggleAR(item: MenuItem) {
        const { error } = await supabase.from('menu_items').update({ ar_enabled: !item.ar_enabled }).eq('id', item.id)
        if (!error) { toast.success(`AR ${!item.ar_enabled ? 'enabled' : 'disabled'} for ${item.name}`); fetchItems() }
    }

    const downloadQR = (item: MenuItem) => {
        const url = qrCodes[item.id]
        if (!url) return
        const a = document.createElement('a')
        a.href = url
        a.download = `ar-menu-${item.name.toLowerCase().replace(/\s/g, '-')}.png`
        a.click()
        toast.success('QR Code downloaded!')
    }

    const arEnabledCount = menuItems.filter(i => i.ar_enabled).length

    if (loading) return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="AR Menu"
                description="Let customers view 3D dishes in Augmented Reality on their phones"
            />

            {/* Hero Info Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Box className="h-5 w-5" />
                            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Augmented Reality</span>
                        </div>
                        <h2 className="text-2xl font-black mb-2">Make Your Menu Come Alive!</h2>
                        <p className="text-white/80 text-sm max-w-lg">
                            Customers scan a QR code and see a 3D model of the dish on their table using AR. No app required — works directly in mobile browser using WebXR.
                        </p>
                        <div className="flex gap-4 mt-4 text-sm">
                            <div>
                                <span className="text-2xl font-black">{arEnabledCount}</span>
                                <span className="ml-1 opacity-75">AR Items</span>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div>
                                <span className="text-2xl font-black">{menuItems.length}</span>
                                <span className="ml-1 opacity-75">Total Items</span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex gap-4">
                        {['📱', '👁️', '🍽️'].map((e, i) => (
                            <div key={i} className={cn('h-16 w-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl border border-white/20 transition-all', i === 1 ? 'scale-110 shadow-2xl' : '')}>
                                {e}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'AR Enabled', value: arEnabledCount, bg: 'bg-purple-50', color: 'text-purple-700' },
                    { label: 'QR Codes Ready', value: Object.keys(qrCodes).length, bg: 'bg-blue-50', color: 'text-blue-700' },
                    { label: 'WebXR Support', value: '96%', bg: 'bg-green-50', color: 'text-green-700' },
                    { label: 'No App Needed', value: '✓', bg: 'bg-amber-50', color: 'text-amber-700' },
                ].map(s => (
                    <Card key={s.label} className={cn('border-0', s.bg)}>
                        <CardContent className="p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
                            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="items">
                <TabsList className="bg-gray-100">
                    <TabsTrigger value="items">Menu Items</TabsTrigger>
                    <TabsTrigger value="howto">How It Works</TabsTrigger>
                    <TabsTrigger value="setup">Setup Guide</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {menuItems.map(item => (
                            <Card key={item.id} className={cn(
                                'border-2 shadow-sm transition-all hover:shadow-md',
                                item.ar_enabled ? 'border-purple-200' : 'border-gray-100'
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex gap-3 mb-3">
                                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            {item.image_url
                                                ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                : <div className="h-full w-full flex items-center justify-center text-2xl">🍽️</div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-xs text-primary font-bold">₹{item.price}</p>
                                                </div>
                                                {item.ar_enabled && (
                                                    <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] shrink-0 ml-1">
                                                        <Box className="h-2.5 w-2.5 mr-1" /> AR
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    <div className="bg-white p-2 rounded-xl flex items-center justify-center mb-3 border border-gray-100">
                                        {qrCodes[item.id]
                                            ? <img src={qrCodes[item.id]} alt="AR QR" className="h-20 w-20 mix-blend-multiply" />
                                            : <QrCode className="h-20 w-20 text-gray-200" />
                                        }
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={item.ar_enabled ? 'default' : 'outline'}
                                            className={cn('flex-1 text-xs h-8',
                                                item.ar_enabled ? 'bg-purple-600 text-white' : 'border-purple-200 text-purple-600'
                                            )}
                                            onClick={() => { setSelectedItem(item); setModelUrl(item.ar_model_url || ''); setArDialogOpen(true) }}
                                        >
                                            <Box className="h-3 w-3 mr-1" />
                                            {item.ar_enabled ? 'Edit 3D' : 'Add 3D'}
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs h-8 px-3" onClick={() => downloadQR(item)}>
                                            <QrCode className="h-3 w-3" />
                                        </Button>
                                        {item.ar_enabled && (
                                            <Button size="sm" variant="outline" className="text-xs h-8 px-3 text-red-500 border-red-200" onClick={() => toggleAR(item)}>
                                                Off
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="howto" className="mt-4">
                    <Card className="border-gray-100">
                        <CardContent className="p-8">
                            <div className="grid md:grid-cols-3 gap-8">
                                {[
                                    { step: '1', icon: '📷', title: 'Customer Scans QR', desc: 'Customer scans the QR code on the table or menu with their phone camera' },
                                    { step: '2', icon: '📱', title: 'Opens in Browser', desc: 'A WebXR page opens in their mobile browser — no app download needed!' },
                                    { step: '3', icon: '🍽️', title: 'Dish Appears in AR', desc: '3D model of the dish appears on their table through the camera in real size' },
                                ].map(s => (
                                    <div key={s.step} className="text-center space-y-3">
                                        <div className="h-16 w-16 mx-auto bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center text-3xl">
                                            {s.icon}
                                        </div>
                                        <h3 className="font-bold text-gray-900">{s.title}</h3>
                                        <p className="text-sm text-gray-500">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-sm text-amber-800">
                                    <strong>💡 Tech Note:</strong> Uses WebXR API + Model Viewer by Google. Supports GLTF/GLB 3D models. Works on iOS 15+ Safari and Android Chrome. For 3D models, use free services like <a href="https://poly.pizza" target="_blank" className="underline">Poly Pizza</a> or commission custom food models from Fiverr/Upwork.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="setup" className="mt-4">
                    <Card className="border-gray-100">
                        <CardContent className="p-8 space-y-6">
                            {[
                                { num: '01', title: 'Get 3D Food Models', desc: 'Download or commission .GLB food models. Free options: Poly Pizza, SketchFab food category. Paid custom: Fiverr (₹2000-5000 per model)', link: 'https://poly.pizza' },
                                { num: '02', title: 'Host Your Models', desc: 'Upload GLB files to your cloud storage (Supabase Storage, Cloudinary, or AWS S3). Copy the public URL.', link: null },
                                { num: '03', title: 'Link Models to Menu Items', desc: 'Click "Add 3D" on any menu item above and paste the model URL. Enable AR toggle.', link: null },
                                { num: '04', title: 'Download & Print QR Codes', desc: 'Download QR codes for each item and print them on table cards or your physical menu.', link: null },
                                { num: '05', title: 'Test on Mobile', desc: 'Scan with your phone to test the AR experience. Works best on iOS 15+ Safari and Android Chrome.', link: null },
                            ].map(step => (
                                <div key={step.num} className="flex gap-4 items-start">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                                        {step.num}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                                        <p className="text-sm text-gray-500">{step.desc}</p>
                                        {step.link && (
                                            <a href={step.link} target="_blank" className="text-xs text-primary underline flex items-center gap-1 mt-1">
                                                <ExternalLink className="h-3 w-3" /> Visit {step.link}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AR Model Dialog */}
            <Dialog open={arDialogOpen} onOpenChange={setArDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Box className="h-5 w-5 text-purple-600" /> Link 3D Model
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem?.name} — Enter the URL of the .GLB or .GLTF 3D model file
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Model URL (.glb / .gltf)</Label>
                            <Input
                                value={modelUrl}
                                onChange={e => setModelUrl(e.target.value)}
                                placeholder="https://yourcdn.com/models/butter-chicken.glb"
                                className="h-10 font-mono text-sm"
                            />
                        </div>
                        {modelUrl && (
                            <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-700">
                                <p className="font-bold mb-1">Preview URL:</p>
                                <a href={`https://modelviewer.dev/editor/?src=${encodeURIComponent(modelUrl)}`} target="_blank" className="underline flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> Test in Model Viewer Editor
                                </a>
                            </div>
                        )}
                        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
                            <p className="font-medium mb-1">Free 3D food models:</p>
                            <ul className="space-y-1">
                                <li>• <a href="https://poly.pizza/search/food" target="_blank" className="text-primary underline">poly.pizza</a> — Free food models</li>
                                <li>• <a href="https://sketchfab.com/tags/food" target="_blank" className="text-primary underline">sketchfab.com</a> — 3D model library</li>
                                <li>• <a href="https://www.fiverr.com" target="_blank" className="text-primary underline">fiverr.com</a> — Custom food models</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setArDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-purple-600 text-white font-bold" onClick={saveARModel} disabled={saving}>
                            {saving ? 'Saving...' : '💾 Save & Enable AR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
