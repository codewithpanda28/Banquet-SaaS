import { useEffect, useState, useRef } from "react"
import { Order, OrderStatus } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import OrderTimer from "./OrderTimer"
import { Leaf, Drumstick, ChefHat, Check, Eye, Sparkles } from "lucide-react"
import { useKitchenStore } from "@/store/kitchenStore"
import { triggerAutomationWebhook } from "@/lib/webhook"
import { cn } from "@/lib/utils"

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
    const [isRecentlyUpdated, setIsRecentlyUpdated] = useState(false)
    const prevUpdatedAtRef = useRef(order.updated_at)
    const prevTotalRef = useRef(order.total)
    const prevStatusRef = useRef(order.status)

    useEffect(() => {
        // Only trigger pulse if:
        // 1. updated_at changed
        // 2. It's NOT the initial creation
        // 3. The status hasn't changed (meaning it's an item update, not a column move)
        //    OR the total has increased (meaning new items were added)
        const totalIncreased = order.total > prevTotalRef.current
        const timeChanged = order.updated_at !== prevUpdatedAtRef.current

        if (timeChanged && totalIncreased) {
            setIsRecentlyUpdated(true)

            const timer = setTimeout(() => {
                setIsRecentlyUpdated(false)
            }, 15000)

            return () => clearTimeout(timer)
        }

        // Always sync refs even if we don't pulse
        prevUpdatedAtRef.current = order.updated_at
        prevTotalRef.current = order.total
        prevStatusRef.current = order.status
    }, [order.updated_at, order.created_at, order.total, order.status])

    const getNextStatus = (): OrderStatus | undefined => {
        const statusFlow: Record<string, OrderStatus> = {
            'pending': 'preparing', // Skip confirmed, go straight to preparing
            'confirmed': 'preparing',
            'preparing': 'ready',
            'ready': 'served'
        }
        return statusFlow[order.status]
    }

    const getActionLabel = () => {
        const labels: Record<string, string> = {
            'pending': 'Start', // Changed from Accept to Start
            'confirmed': 'Start',
            'preparing': 'Ready',
            'ready': 'Serve'
        }
        return labels[order.status] || 'Process'
    }

    const handleQuickAction = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsRecentlyUpdated(false) // Clear highlight when acted upon
        const nextStatus = getNextStatus()
        if (nextStatus) {
            updateOrder(order.id, { status: nextStatus })
        }
    }

    const orderItems = order.order_items || []

    return (
        <Card
            className={cn(
                "group relative overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer",
                isRecentlyUpdated
                    ? "border-red-500 shadow-[0_0_20px_rgba(239,44,44,0.3)] animate-pulse"
                    : "border-slate-200 bg-white shadow-sm hover:border-primary/50 hover:shadow-primary/10 animate-slide-in"
            )}
            onClick={onViewDetails}
        >
            {/* Top Accent Bar */}
            <div className={`h-1.5 w-full ${isRecentlyUpdated ? 'bg-red-500' : config.gradient}`} />

            {/* New Items Badge */}
            {isRecentlyUpdated && (
                <div className="absolute top-3 right-0 z-20">
                    <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-l-lg shadow-lg flex items-center gap-1 animate-bounce">
                        <Sparkles className="w-3 h-3" />
                        NEW ITEMS ADDED
                    </div>
                </div>
            )}

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
                            <div className="flex flex-col">
                                <span className="font-mono text-xs text-slate-500 font-semibold">
                                    #{order.bill_id}
                                </span>
                                {order.notes && (
                                    <span className="text-[10px] font-black text-slate-400 leading-none mt-0.5">
                                        {order.notes.includes('Approved') ? order.notes : null}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <OrderTimer createdAt={order.created_at} />
                </div>

                {/* Items List */}
                <div className={cn(
                    "space-y-2 rounded-lg border p-3 transition-colors",
                    isRecentlyUpdated ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
                )}>
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
                                    className={cn(
                                        "flex-1 font-semibold shadow-lg transition-all",
                                        isRecentlyUpdated
                                            ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                                            : "bg-gradient-to-r from-primary to-orange-500 shadow-primary/25 hover:shadow-primary/30"
                                    )}
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
