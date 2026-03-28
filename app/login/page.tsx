'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound, Loader2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, getRestaurantId } from '@/lib/supabase'

export default function LoginPage() {
    const [passcode, setPasscode] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const restaurantId = getRestaurantId()
            
            // 🔍 Verify Passcode from DB
            const { data, error } = await supabase
                .from('restaurants')
                .select('admin_passcode, name')
                .eq('id', restaurantId)
                .single()

            if (error) {
                toast.error('Restaurant not found or database error')
                return
            }

            if (passcode === data.admin_passcode) {
                // Store login session
                localStorage.setItem('admin_logged_in', 'true')
                localStorage.setItem('admin_restaurant_id', restaurantId)

                toast.success(`Welcome back, ${data.name}!`)
                
                // 🚀 Full Page Refresh redirect (Ensures Layout picks up the new localStorage/cookies)
                window.location.href = '/admin'
            } else {
                toast.error('❌ Invalid Authentication Passcode')
            }
        } catch (error: any) {
            console.error('Login error:', error)
            toast.error('Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#3b82f61a,transparent_50%)]" />
            
            <Card className="w-full max-w-md border border-white/10 shadow-2xl bg-[#111111] rounded-[3rem] overflow-hidden relative z-10">
                <CardHeader className="space-y-4 text-center pb-10 pt-12 border-b border-white/5">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20">
                            <UtensilsCrossed className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black text-white italic tracking-tighter uppercase">Admin <span className="text-blue-500">Access</span></CardTitle>
                        <CardDescription className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                             Secure Terminal for Restaurant Owners
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-12 pb-12 px-10">
                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 ml-1">Master Passcode</Label>
                            <div className="relative group">
                                <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="••••"
                                    required
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    className="h-20 bg-black border-white/10 rounded-3xl pl-16 text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-white placeholder:text-gray-800"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-20 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-white border-0"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                'Unlock Dashboard'
                            )}
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.3em]">
                             SaaS Multi-Tenant Cloud Protocol v2.5
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
