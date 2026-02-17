'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, UtensilsCrossed, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'

function ScanPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [phone, setPhone] = useState('')
    const [tableNumber, setTableNumber] = useState<string | null>(null)

    useEffect(() => {
        const table = searchParams.get('table')
        if (table) {
            setTableNumber(table)
        }
    }, [searchParams])

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!phone || phone.length < 10) {
            toast.error('Please enter a valid phone number')
            return
        }

        try {
            setLoading(true)

            // Update Table Status (if table number exists)
            if (tableNumber) {
                const { error: tableError } = await supabase
                    .from('restaurant_tables')
                    .update({ status: 'occupied' })
                    .eq('table_number', parseInt(tableNumber))
                    .eq('restaurant_id', process.env.NEXT_PUBLIC_RESTAURANT_ID)

                if (tableError) {
                    console.error('Failed to update table status:', tableError)
                }
            }

            // Trigger n8n Webhook
            const webhookUrl = process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL
            if (!webhookUrl) {
                console.error('Webhook URL not configured')
                // Continue anyway to menu
            } else {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contact: {
                            // Ensure phone has country code (ThinkAIQ format) - currently assuming India (91)
                            phone_number: phone.length === 10 ? `91${phone}` : phone,
                            first_name: "Customer Scan",
                            status: "new"
                        },
                        message: {
                            body: `I am at Table ${tableNumber}`,
                            type: "text",
                            is_new_message: true,
                            direction: "inbound"
                        }
                    })
                }).catch(err => console.error('Webhook failed', err))
            }

            toast.success('Welcome! Redirecting to menu...')

            // Redirect to Menu
            router.push(`/menu?table=${tableNumber || ''}`)
        } catch (error) {
            console.error('Error processing scan:', error)
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                        <UtensilsCrossed className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to Restaurant</CardTitle>
                    <CardDescription>
                        {tableNumber
                            ? `You are seated at Table ${tableNumber}`
                            : 'Please enter your details to view the menu'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleScan} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Mobile Number
                            </label>
                            <Input
                                type="tel"
                                placeholder="Enter your 10-digit number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                maxLength={10}
                                className="h-12 text-lg text-center tracking-widest"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold"
                            disabled={loading || phone.length < 10}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    View Menu <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-4">
                            By continuing, you perform a digital check-in.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default function ScanPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ScanPageContent />
        </Suspense>
    )
}
