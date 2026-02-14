'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            // Simple credential check from .env
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
            const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

            if (email === adminEmail && password === adminPassword) {
                // Store login session
                localStorage.setItem('admin_logged_in', 'true')
                localStorage.setItem('admin_email', email)

                toast.success('✅ Login successful!')
                router.push('/admin')
            } else {
                toast.error('❌ Invalid email or password')
            }
        } catch (error) {
            console.error('Login error:', error)
            toast.error('Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl bg-white rounded-2xl overflow-hidden">
                <CardHeader className="space-y-1 text-center bg-gradient-to-br from-primary to-orange-600 text-white pb-8 pt-10">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                            <UtensilsCrossed className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black">Restaurant Admin</CardTitle>
                    <CardDescription className="text-white/80 font-medium">
                        Enter your credentials to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@restaurant.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="border-2 h-12 rounded-xl focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-bold uppercase tracking-wider">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="border-2 h-12 rounded-xl focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full font-bold h-12 rounded-xl text-base shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-orange-600 hover:shadow-xl transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In to Dashboard'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-dashed text-center">
                        <p className="text-xs text-muted-foreground font-medium">
                            🔐 Credentials configured in .env.local
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
