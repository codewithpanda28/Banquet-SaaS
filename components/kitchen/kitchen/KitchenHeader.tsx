"use client"

import { useEffect, useState } from "react"
import { useKitchenStore } from "@/store/kitchenStore"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Settings, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { supabase, RESTAURANT_ID } from "@/lib/supabase"

export default function KitchenHeader() {
    const { isSoundEnabled, toggleSound, orders } = useKitchenStore()
    const [currentTime, setCurrentTime] = useState<Date | null>(null)
    const [mounted, setMounted] = useState(false)
    const [restaurantName, setRestaurantName] = useState("Kitchen Display")
    const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        setCurrentTime(new Date())
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)

        // Fetch Restaurant Name & Logo
        const fetchInfo = async () => {
            const { data } = await supabase
                .from('restaurants')
                .select('name, logo_url')
                .eq('id', RESTAURANT_ID)
                .single()
            if (data) {
                setRestaurantName(data.name || "Kitchen Display")
                setRestaurantLogo(data.logo_url)
            }
        }
        fetchInfo()

        return () => clearInterval(timer)
    }, [])

    // Calculate active orders count
    const activeOrdersCount = orders.filter(o =>
        ['pending', 'confirmed', 'preparing'].includes(o.status)
    ).length

    return (
        <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-border/40 bg-card/95 px-8 shadow-lg backdrop-blur-xl">
            {/* Left Side - Branding */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-500 shadow-lg overflow-hidden">
                        {restaurantLogo ? (
                            <img src={restaurantLogo} className="h-full w-full object-cover" alt="Logo" />
                        ) : (
                            <span className="text-2xl">👨‍🍳</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            {restaurantName}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
                            </div>
                        </h1>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Kitchen Ops</p>
                    </div>
                </div>

                {/* Active Orders Count */}
                {activeOrdersCount > 0 && (
                    <div className="glass-strong flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-primary">{activeOrdersCount}</span>
                        <span className="text-muted-foreground">Active</span>
                    </div>
                )}
            </div>

            {/* Right Side - Time & Actions */}
            <div className="flex items-center gap-6">
                {/* Live Clock */}
                <div className="glass rounded-xl px-6 py-2 text-right">
                    <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                        {mounted && currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {mounted && currentTime ? format(currentTime, "EEE, MMM d") : "Loading..."}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Sound Toggle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleSound}
                        className={`h-11 w-11 rounded-xl border-2 transition-all ${isSoundEnabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "border-muted-foreground/20 text-muted-foreground hover:bg-muted"
                            }`}
                        title={isSoundEnabled ? "Sound On" : "Sound Off"}
                    >
                        {isSoundEnabled ? (
                            <Volume2 className="h-5 w-5" />
                        ) : (
                            <VolumeX className="h-5 w-5" />
                        )}
                    </Button>

                    </div>
            </div>
        </header>
    )
}
