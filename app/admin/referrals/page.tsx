'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
    Users,
    Zap,
    RefreshCw,
    Gift,
    Plus,
    ChevronRight,
    Loader2,
    Search,
    Check,
    LayoutGrid,
    SearchX,
    Percent,
    IndianRupee,
    Tag,
    Share2,
    Trophy,
    Info,
    XCircle,
    CheckCircle2
} from 'lucide-react'
import { supabase, getRestaurantId } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ReferralSettings {
    id: string
    referrer_reward_type: 'points' | 'fixed' | 'percentage' | 'free_item'
    referrer_reward_value: number
    referrer_reward_item_id: string | null
    referee_reward_type: 'none' | 'points' | 'fixed' | 'percentage' | 'free_item'
    referee_reward_value: number
    referee_reward_item_id: string | null
    is_active: boolean
}

interface MenuItem {
    id: string
    name: string
    image_url: string
    price: number
}

export default function ReferralProgramPage() {
    const [settings, setSettings] = useState<ReferralSettings | null>(null)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isMenuBrowserOpen, setIsMenuBrowserOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'referrer' | 'referee'>('referrer')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const id = getRestaurantId()
            if (!id) return

            const { data: settingsData, error: settingsError } = await supabase
                .from('referral_settings')
                .select('*')
                .eq('restaurant_id', id)
                .single()

            if (settingsData) {
                setSettings(settingsData)
            } else {
                const defaultSettings: any = {
                    restaurant_id: id,
                    referrer_reward_type: 'points',
                    referrer_reward_value: 500,
                    referrer_reward_item_id: null,
                    referee_reward_type: 'none',
                    referee_reward_value: 0,
                    referee_reward_item_id: null,
                    is_active: true
                }
                setSettings(defaultSettings as ReferralSettings)
            }

            const { data: items } = await supabase
                .from('menu_items')
                .select('id, name, image_url, price')
                .eq('restaurant_id', id)
            
            const validItems = (items || []).filter(i => !i.name.startsWith('[DELETED]'))
            setMenuItems(validItems)

        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load referral program')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [menuItems, searchQuery])

    const handleSaveSettings = async () => {
        if (!settings) return
        try {
            setSaving(true)
            const id = getRestaurantId()
            
            const { error } = await supabase
                .from('referral_settings')
                .upsert({
                    ...settings,
                    restaurant_id: id,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'restaurant_id' 
                })

            if (error) throw error
            toast.success('Settings Saved Successfully!')
        } catch (error: any) {
            toast.error('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const updateRewardType = (type: any, isReferrer: boolean) => {
        if (!settings) return
        if (isReferrer) {
            setSettings({
                ...settings,
                referrer_reward_type: type,
                referrer_reward_value: type === 'points' ? 500 : 0
            })
        } else {
            setSettings({
                ...settings,
                referee_reward_type: type,
                referee_reward_value: type === 'points' ? 100 : 0
            })
        }
    }

    const handleItemSelect = (item: MenuItem, isReferrer: boolean) => {
        if (!settings) return
        if (isReferrer) {
            setSettings({
                ...settings,
                referrer_reward_item_id: item.id
            })
        } else {
            setSettings({
                ...settings,
                referee_reward_item_id: item.id
            })
        }
        setIsMenuBrowserOpen(false)
    }

    if (loading || !settings) return (
        <div className="flex h-screen items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )

    const renderValueDisplay = (type: string, value: number, itemId: string | null) => {
        if (type === 'points') return `${value} Points`
        if (type === 'percentage') return `${value}% OFF`
        if (type === 'fixed') return `₹${value} OFF`
        if (type === 'free_item') {
            const item = menuItems.find(i => i.id === itemId)
            return item ? `FREE ${item.name}` : 'FREE Item'
        }
        return 'No Reward'
    }

    const activeRewardType = activeTab === 'referrer' ? settings.referrer_reward_type : settings.referee_reward_type
    const activeRewardValue = activeTab === 'referrer' ? settings.referrer_reward_value : settings.referee_reward_value
    const activeRewardItemId = activeTab === 'referrer' ? settings.referrer_reward_item_id : settings.referee_reward_item_id

    return (
        <div className="space-y-6 pb-20 bg-gray-50/50 min-h-screen">
            <PageHeader 
                title="Referral Program" 
                description="Easily manage how customers get rewarded for inviting their friends."
            >
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
                    <span className="text-xs font-bold text-gray-500">Program Active</span>
                    <Switch 
                        checked={settings.is_active} 
                        onCheckedChange={(val) => setSettings({...settings!, is_active: val})}
                    />
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto px-4">
                {/* Left: Configuration */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="border-b p-6 flex items-center justify-between bg-white">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-gray-900">Program Settings</h2>
                                <p className="text-xs text-gray-500 font-medium">Configure rewards for both sides</p>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setActiveTab('referrer')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                        activeTab === 'referrer' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Referrer Reward
                                </button>
                                <button 
                                    onClick={() => setActiveTab('referee')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                        activeTab === 'referee' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Friend Reward
                                </button>
                            </div>
                        </div>

                        <CardContent className="p-8 space-y-10">
                            <div className="space-y-8">
                                {/* Step 1 */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">1. Choose Reward Type</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { id: 'points', icon: Trophy, label: 'Points' },
                                            { id: 'fixed', icon: IndianRupee, label: 'Cash OFF' },
                                            { id: 'percentage', icon: Percent, label: 'Discount %' },
                                            { id: 'free_item', icon: Gift, label: 'Free Item' },
                                            ...(activeTab === 'referee' ? [{ id: 'none', icon: XCircle, label: 'No Reward' }] : [])
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => updateRewardType(type.id, activeTab === 'referrer')}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                                                    activeRewardType === type.id 
                                                        ? "border-blue-600 bg-blue-50 text-blue-700" 
                                                        : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                                                )}
                                            >
                                                <type.icon className={cn("h-5 w-5", activeRewardType === type.id ? "text-blue-600" : "text-gray-400")} />
                                                <span className="text-[10px] font-bold uppercase">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="space-y-4 pb-4">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">
                                        {activeRewardType === 'free_item' ? '2. Select Item' : '2. Enter Amount/Points'}
                                    </label>

                                    {activeRewardType === 'free_item' ? (
                                        <Dialog open={isMenuBrowserOpen} onOpenChange={setIsMenuBrowserOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full h-14 rounded-xl border-gray-200 bg-gray-50 hover:bg-white flex items-center justify-between px-4 group">
                                                    <div className="flex items-center gap-3">
                                                        <Gift className="h-5 w-5 text-gray-400" />
                                                        <span className="text-sm font-bold text-gray-700">
                                                            {activeRewardItemId ? menuItems.find(i => i.id === activeRewardItemId)?.name : 'Click to select item'}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-300" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xl h-[70vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
                                                <div className="p-6 border-b">
                                                    <DialogTitle className="text-lg font-bold">Select Menu Item</DialogTitle>
                                                    <div className="relative mt-4">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                        <Input 
                                                            placeholder="Search menu..." 
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="h-10 pl-10 rounded-lg bg-gray-50 border-transparent focus:bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                                    {filteredItems.map(item => (
                                                        <div 
                                                            key={item.id}
                                                            className={cn(
                                                                "flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all",
                                                                activeRewardItemId === item.id 
                                                                    ? "border-blue-500 bg-blue-50 shadow-sm" 
                                                                    : "border-gray-100 hover:border-gray-200"
                                                            )}
                                                            onClick={() => handleItemSelect(item, activeTab === 'referrer')}
                                                        >
                                                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                                                <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                                <p className="text-xs text-gray-500">₹{item.price}</p>
                                                            </div>
                                                            {activeRewardItemId === item.id && <Check className="h-5 w-5 text-blue-600" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ) : activeRewardType === 'none' ? (
                                        <div className="p-10 border-2 border-dashed border-gray-100 rounded-2xl text-center text-gray-400 text-xs font-bold">
                                            No reward for friends. They just get a clean invite.
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                {activeRewardType === 'points' ? 'Pts' : activeRewardType === 'percentage' ? '%' : '₹'}
                                            </div>
                                            <Input 
                                                type="number" 
                                                placeholder="0.00" 
                                                value={activeRewardValue || ''} 
                                                onChange={(e) => {
                                                    const val = Number(e.target.value)
                                                    if (activeTab === 'referrer') {
                                                        setSettings({...settings, referrer_reward_value: val})
                                                    } else {
                                                        setSettings({...settings, referee_reward_value: val})
                                                    }
                                                }} 
                                                className="h-14 pl-12 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-500 focus:bg-white font-bold text-xl" 
                                            />
                                        </div>
                                    )}
                                </div>

                                <Button 
                                    className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-100 gap-2" 
                                    onClick={handleSaveSettings} 
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Preview */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white h-full">
                        <CardContent className="p-6 h-full flex flex-col">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6">Phone View Preview</h3>
                            
                            <div className="flex-1 bg-gray-900 rounded-[2rem] border-[6px] border-gray-800 p-6 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
                                {/* Subtle Glow */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full" />
                                
                                <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 relative z-10">
                                    <Gift className="h-8 w-8 text-white" />
                                </div>

                                <div className="space-y-1 relative z-10">
                                    <h4 className="text-3xl font-black text-white italic tracking-tighter">Refer & Earn</h4>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Join our invite program</p>
                                </div>

                                <div className="w-full space-y-3 relative z-10">
                                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 text-left">
                                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-2">You Get</p>
                                        <p className="text-xl font-black text-white leading-none">
                                            {renderValueDisplay(settings.referrer_reward_type, settings.referrer_reward_value, settings.referrer_reward_item_id)}
                                        </p>
                                    </div>

                                    {settings.referee_reward_type !== 'none' && (
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-left">
                                            <p className="text-[8px] font-bold text-green-400 uppercase tracking-widest leading-none mb-2">Friend Gets</p>
                                            <p className="text-lg font-black text-gray-300 leading-none">
                                                {renderValueDisplay(settings.referee_reward_type, settings.referee_reward_value, settings.referee_reward_item_id)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-600 w-full py-4 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 relative z-10">
                                    Send Invite
                                </div>

                                <div className="pt-2">
                                    <p className="text-[9px] text-gray-500 font-bold leading-relaxed">Reward valid after friend's first bill settlement.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
