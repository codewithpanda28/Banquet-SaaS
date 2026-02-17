'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const [isVerified, setIsVerified] = useState(false)
    const [code, setCode] = useState('')
    const [mounted, setMounted] = useState(false)
    const [error, setError] = useState(false)

    useEffect(() => {
        setMounted(true)
        const verified = sessionStorage.getItem('admin_passcode_verified')
        if (verified === 'true') {
            setIsVerified(true)
        }
    }, [])

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault()
        const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE

        if (code === PASSCODE) {
            sessionStorage.setItem('admin_passcode_verified', 'true')
            setIsVerified(true)
            toast.success('Dashboard Unlocked')
        } else {
            setError(true)
            toast.error('Incorrect Passcode')
            setCode('')
        }
    }

    if (!mounted) return null // Prevent hydration mismatch

    if (isVerified) {
        return <>{children}</>
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 text-white p-4 font-sans">
            <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                <div className="bg-white/10 p-6 rounded-full ring-1 ring-white/20 shadow-2xl shadow-purple-500/20">
                    <Lock className="w-10 h-10 text-white" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Admin Locked</h1>
                    <p className="text-white/40 text-sm">Enter security passcode to continue</p>
                </div>

                <form onSubmit={handleVerify} className="w-full space-y-4">
                    <div className="space-y-2 relative">
                        <Input
                            type="password"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value)
                                setError(false)
                            }}
                            placeholder="••••"
                            className={`bg-white/5 border-white/10 text-center text-3xl tracking-[1em] h-16 rounded-xl focus:border-white/30 transition-all font-mono placeholder:tracking-widest placeholder:text-white/10 ${error ? 'border-red-500/50 animate-shake' : ''}`}
                            maxLength={6}
                            autoFocus
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Unlock Dashboard
                    </Button>
                </form>

                <p className="text-xs text-white/20 fixed bottom-8">Secured by RestaurantOS</p>
            </div>
        </div>
    )
}
