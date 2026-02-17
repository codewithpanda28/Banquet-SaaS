"use client"

import { Order, OrderStatus } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import OrderTimer from "./OrderTimer"
import { Leaf, Drumstick, ChefHat, Check, Eye } from "lucide-react"
import { useKitchenStore } from "@/store/kitchenStore"
import { triggerPaymentWebhook } from "@/lib/webhook"

interface OrderCardProps {
    order: Order
    onViewDetails: () => void
}

const orderTypeConfig = {
    dine_in: {
        label: 'Dine In',
        icon: '🍽️',
        gradient: 'gradient-blue',
        textColor: 'text-blue-300',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30'
    },
    take_away: {
        label: 'Takeaway',
        icon: '🥡',
        gradient: 'gradient-purple',
        textColor: 'text-purple-300',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30'
    },
    home_delivery: {
        label: 'Delivery',
        icon: '🛵',
        gradient: 'gradient-warning',
        textColor: 'text-amber-300',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30'
    }
}

export default function OrderCard({ order, onViewDetails }: OrderCardProps) {
    const { updateOrder } = useKitchenStore()
    const config = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig]

    const getNextStatus = (): OrderStatus | undefined => {
        const statusFlow: Record<string, OrderStatus> = {
            'pending': 'confirmed',
            'confirmed': 'preparing',
            'preparing': 'ready',
            'ready': 'served'
        }
        return statusFlow[order.status]
    }

    const getActionLabel = () => {
        const labels: Record<string, string> = {
            'pending': 'Accept',
            'confirmed': 'Start',
            'preparing': 'Ready',
            'ready': 'Serve'
        }
        return labels[order.status] || 'Process'
    }

    const handleQuickAction = (e: React.MouseEvent) => {
        e.stopPropagation()
        const nextStatus = getNextStatus()
        if (nextStatus) {
            updateOrder(order.id, { status: nextStatus })

            if (nextStatus === 'served') {
                triggerPaymentWebhook({
                    bill_id: order.bill_id,
                    amount: order.total || 0,
                    customer: {
                        name: order.customers?.name || 'Customer',
                        phone: order.customers?.phone || 'N/A'
                    },
                    order_type: order.order_type,
                    table_number: order.restaurant_tables?.table_number,
                    items: (order.order_items || []).map((i) => ({
                        name: i.item_name || i.menu_items?.name || 'Unknown Item',
                        quantity: i.quantity,
                        price: i.price,
                        total: i.total
                    })),
                    status: 'served',
                    restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID,
                    updated_at: new Date().toISOString(),
                    source: 'kitchen_dashboard',
                    trigger_type: 'order_served'
                })
            }
        }
    }

    const orderItems = order.order_items || []

    return (
        <Card
            className="group relative overflow-hidden border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 animate-slide-in cursor-pointer"
            onClick={onViewDetails}
        >
            {/* Top Accent Bar */}
            <div className={`h-1.5 w-full ${config.gradient}`} />

            <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor} border ${config.borderColor}`}>
                            <span className="text-xl">{config.icon}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${config.textColor}`}>
                                    {config.label}
                                </span>
                                {order.restaurant_tables?.table_number && (
                                    <Badge variant="outline" className="h-5 text-xs font-mono border-slate-300 text-slate-700">
                                        Table {order.restaurant_tables.table_number}
                                    </Badge>
                                )}
                            </div>
                            <div className="font-mono text-xs text-slate-500 font-semibold">
                                #{order.bill_id}
                            </div>
                        </div>
                    </div>

                    <OrderTimer createdAt={order.created_at} />
                </div>

                {/* Items List */}
                <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-100 p-3">
                    {orderItems.length > 0 ? (
                        <>
                            {orderItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                    <div className="mt-0.5">
                                        {item.menu_items?.is_veg ? (
                                            <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-emerald-500">
                                                <Leaf className="h-2.5 w-2.5 text-emerald-500" />
                                            </div>
                                        ) : (
                                            <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-red-500">
                                                <Drumstick className="h-2.5 w-2.5 text-red-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 leading-tight">
                                        <span className="font-bold text-black">
                                            {item.quantity}x
                                        </span>{" "}
                                        <span className="text-slate-900 font-medium">{item.item_name}</span>
                                        {item.special_instructions && (
                                            <div className="mt-0.5 text-xs italic text-amber-400">
                                                → {item.special_instructions}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {orderItems.length > 3 && (
                                <div className="text-center text-xs text-slate-500 font-medium">
                                    +{orderItems.length - 3} more items
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-xs text-slate-500 font-medium">
                            No items
                        </div>
                    )}
                </div>

                {/* Special Instructions */}
                {order.special_instructions && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                        <div className="flex items-start gap-2">
                            <span className="text-sm">⚠️</span>
                            <p className="flex-1 text-xs font-bold text-amber-700 leading-relaxed">
                                {order.special_instructions}
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {order.status === 'served' || order.status === 'completed' ? (
                        <div className="flex-1 h-9 bg-green-50 border-2 border-green-200 rounded-lg flex items-center justify-center gap-2 text-green-700 font-bold text-sm">
                            <Check className="h-4 w-4" />
                            Order Completed
                        </div>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onViewDetails()
                                }}
                            >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View
                            </Button>

                            {order.status !== 'ready' && (
                                <Button
                                    size="sm"
                                    className="flex-1 bg-gradient-to-r from-primary to-orange-500 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                                    onClick={handleQuickAction}
                                >
                                    {order.status === 'pending' && <Check className="mr-1.5 h-3.5 w-3.5" />}
                                    {order.status === 'preparing' && <ChefHat className="mr-1.5 h-3.5 w-3.5" />}
                                    {getActionLabel()}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Hover Effect Overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            </div>
        </Card>
    )
}
