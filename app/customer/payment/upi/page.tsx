'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useRestaurant } from '@/hooks/useRestaurant'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, ArrowRight, Loader2 } from 'lucide-react'

function UPIPaymentContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const billId = searchParams.get('billId')
    const amountParam = searchParams.get('amount')
    const amount = parseFloat(amountParam || '0')

    const { restaurant } = useRestaurant()
    const [upiUrl, setUpiUrl] = useState('')
    const [activeButton, setActiveButton] = useState<'payment' | 'cash' | null>(null)

    useEffect(() => {
        if (restaurant?.upi_id && amount > 0) {
            // Construct UPI URL
            const url = `upi://pay?pa=${restaurant.upi_id}&pn=${encodeURIComponent(restaurant.name)}&am=${amount}&tr=${billId}&tn=${encodeURIComponent(`Payment for Bill ${billId}`)}&cu=INR`
            setUpiUrl(url)
        }
    }, [restaurant, amount, billId])

    const copyUpiId = () => {
        if (restaurant?.upi_id) {
            navigator.clipboard.writeText(restaurant.upi_id)
            toast.success('UPI ID copied to clipboard')
        }
    }

    const handlePaymentDone = async (type: 'payment' | 'cash') => {
        try {
            setActiveButton(type)
            const isCash = type === 'cash'
            
            // 📡 [Automation] Manual Trigger removed as requested

            toast.success(isCash ? 'Order Confirmed! Pay at Counter. 💰' : 'Thank you! Order Received. ✅')
            router.replace(`/customer/track/${billId}`)
        } catch (error) {
            console.error('Webhook error:', error)
            router.replace(`/customer/track/${billId}`)
        } finally {
            setActiveButton(null)
        }
    }

    if (!billId || !amount) return <div>Invalid Payment Details</div>

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-primary/10 to-background text-center space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Scan to Pay</h1>
                <p className="text-muted-foreground">Using any UPI App (GPay, PhonePe, Paytm)</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border">
                {restaurant?.qr_code_url ? (
                    <img src={restaurant.qr_code_url} className="w-[200px] h-[200px] object-contain mx-auto" alt="Payment QR" />
                ) : upiUrl ? (
                    <QRCodeSVG value={upiUrl} size={200} level="H" includeMargin />
                ) : (
                    <div className="w-[200px] h-[200px] bg-secondary flex items-center justify-center animate-pulse">
                        Loading QR...
                    </div>
                )}
                <div className="mt-4 font-bold text-2xl">₹{amount.toFixed(2)}</div>
            </div>

            <div className="w-full max-w-xs space-y-4">
                {restaurant?.upi_id && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                        <span className="font-medium text-sm truncate">{restaurant.upi_id}</span>
                        <Button variant="ghost" size="sm" onClick={copyUpiId}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {upiUrl && (
                    <Button
                        asChild
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 rounded-xl mb-4"
                    >
                        <a href={upiUrl}>
                            Pay with UPI App / GPay
                        </a>
                    </Button>
                )}

                <Button 
                    className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700" 
                    onClick={() => handlePaymentDone('payment')}
                    disabled={activeButton !== null}
                >
                    {activeButton === 'payment' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'I have completed payment'} 
                    {activeButton !== 'payment' && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
                
                <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handlePaymentDone('cash')}
                    disabled={activeButton !== null}
                >
                    {activeButton === 'cash' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Pay Cash at Counter'}
                </Button>
            </div>
        </div>
    )
}

export default function UPIPaymentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Payment...</div>}>
            <UPIPaymentContent />
        </Suspense>
    )
}
