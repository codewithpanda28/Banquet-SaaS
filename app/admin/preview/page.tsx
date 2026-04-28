'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Smartphone,
    UtensilsCrossed,
    ExternalLink,
    Monitor,
    Tablet,
    RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppPreviewPage() {
    const [activeTab, setActiveTab] = useState<'customer' | 'kitchen'>('customer')
    const [customerKey, setCustomerKey] = useState(0)
    const [kitchenKey, setKitchenKey] = useState(0)

    const refreshCustomer = () => setCustomerKey(prev => prev + 1)
    const refreshKitchen = () => setKitchenKey(prev => prev + 1)

    return (
        <div className="space-y-6 p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight text-gradient">App Previews</h2>
                    <p className="text-gray-500 font-medium">
                        Preview how your Customer and Kitchen dashboards look to end users
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'kitchen')} className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                        <TabsTrigger
                            value="customer"
                            className="rounded-lg px-6 py-2.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold flex items-center gap-2"
                        >
                            <Smartphone className="h-4 w-4" />
                            Customer App
                        </TabsTrigger>
                        <TabsTrigger
                            value="kitchen"
                            className="rounded-lg px-6 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold flex items-center gap-2"
                        >
                            <UtensilsCrossed className="h-4 w-4" />
                            Kitchen Dashboard
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        {activeTab === 'customer' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshCustomer}
                                    className="rounded-xl hover:bg-blue-50 border-gray-200"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('/customer', '_blank')}
                                    className="rounded-xl hover:bg-blue-50 border-gray-200"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in New Tab
                                </Button>
                            </>
                        )}
                        {activeTab === 'kitchen' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshKitchen}
                                    className="rounded-xl hover:bg-orange-50 border-gray-200"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('/kitchen', '_blank')}
                                    className="rounded-xl hover:bg-orange-50 border-gray-200"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in New Tab
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Customer App Preview */}
                <TabsContent value="customer" className="mt-0">
                    <Card className="border-gray-200 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Smartphone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Customer App Dashboard</h3>
                                            <p className="text-xs text-blue-100">View as your customers see it</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-white/20 text-white border-white/30 font-semibold">
                                        Live Preview
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50">
                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                                    {/* Browser Chrome */}
                                    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                                        <div className="flex gap-1.5">
                                            <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                            <div className="h-3 w-3 rounded-full bg-green-400"></div>
                                        </div>
                                        <div className="flex-1 bg-white rounded-lg px-4 py-1 text-xs text-gray-500 font-mono">
                                            https://banquet-saas.vercel.app/customer
                                        </div>
                                    </div>

                                    {/* Iframe Content */}
                                    <div className="relative" style={{ height: 'calc(100vh - 350px)', minHeight: '600px' }}>
                                        <iframe
                                            key={customerKey}
                                            src="/customer"
                                            className="w-full h-full"
                                            title="Customer App Preview"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Kitchen Dashboard Preview */}
                <TabsContent value="kitchen" className="mt-0">
                    <Card className="border-gray-200 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                            <UtensilsCrossed className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Kitchen Dashboard</h3>
                                            <p className="text-xs text-orange-100">View as kitchen staff see it</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-white/20 text-white border-white/30 font-semibold">
                                        Live Preview
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50">
                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                                    {/* Browser Chrome */}
                                    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                                        <div className="flex gap-1.5">
                                            <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                            <div className="h-3 w-3 rounded-full bg-green-400"></div>
                                        </div>
                                        <div className="flex-1 bg-white rounded-lg px-4 py-1 text-xs text-gray-500 font-mono">
                                            https://banquet-saas.vercel.app/kitchen
                                        </div>
                                    </div>

                                    {/* Iframe Content */}
                                    <div className="relative" style={{ height: 'calc(100vh - 350px)', minHeight: '600px' }}>
                                        <iframe
                                            key={kitchenKey}
                                            src="/kitchen"
                                            className="w-full h-full"
                                            title="Kitchen Dashboard Preview"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                                <Smartphone className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-900">Customer App</h4>
                                <p className="text-xs text-gray-600 mt-1">
                                    This is what customers see when they scan QR codes at tables or access the menu online.
                                    They can browse items, add to cart, and place orders.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0">
                                <UtensilsCrossed className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-900">Kitchen Dashboard</h4>
                                <p className="text-xs text-gray-600 mt-1">
                                    This is the kitchen staff's view for managing incoming orders.
                                    They can mark orders as preparing, ready, or completed in real-time.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
