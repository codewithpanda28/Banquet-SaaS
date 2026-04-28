
"use client"

import { useState, useEffect } from "react"
import { Order, OrderItem } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useKitchenStore } from "@/store/kitchenStore"
import { Separator } from "@/components/ui/separator"
import { Check, ChefHat, Printer, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"

import { updateOrderItemStatus, getActiveOrders } from "@/services/orderService"

interface OrderDetailsProps {
    order: Order | null
    onClose: () => void
}

export default function OrderDetails({ order: initialOrder, onClose }: OrderDetailsProps) {
    const { updateOrder, orders } = useKitchenStore()
    const [localOrder, setLocalOrder] = useState<Order | null>(initialOrder)

    // Sync with kitchen store - update local localOrder when store updates
    useEffect(() => {
        if (initialOrder) {
            const updatedOrder = orders.find(o => o.id === initialOrder.id)
            if (updatedOrder) {
                setLocalOrder(updatedOrder)
                console.log('📡 [KITCHEN MODAL] Order updated from store', updatedOrder)
            }
        }
    }, [orders, initialOrder])

    // Initial sync
    useEffect(() => {
        setLocalOrder(initialOrder)
    }, [initialOrder])

    if (!localOrder) return null

    const handleStatusChange = (status: Order["status"]) => {
        updateOrder(localOrder.id, { status })
        console.log(`🔄 [KITCHEN] Order status changed to ${status}`)
        onClose()
    }

    const toggleItemComplete = async (itemId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ready' ? 'pending' : 'ready'
        console.log(`🔄 [KITCHEN] Toggling item ${itemId} from ${currentStatus} to ${newStatus}`)

        const success = await updateOrderItemStatus(itemId, newStatus)

        if (success) {
            console.log(`✅ [KITCHEN] Item ${itemId} status updated successfully`)

            // Optimistically update the local localOrder state
            setLocalOrder(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    order_items: prev.order_items?.map(item =>
                        item.id === itemId ? { ...item, status: newStatus } : item
                    )
                }
            })
        } else {
            console.error(`❌ [KITCHEN] Failed to update item ${itemId} status`)
        }
    }

    const printKOT = () => {
        const printContent = `
      <html>
      <head>
        <title>KOT - ${localOrder.bill_id}</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
          .item { margin: 5px 0; display: flex; align-items: flex-start; }
          .qty { font-weight: bold; width: 30px; }
          .name { flex: 1; }
          .instructions { font-style: italic; font-size: 11px; margin-left: 30px; }
          .footer { margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>KITCHEN ORDER</h3>
          <p>#${localOrder.bill_id}</p>
          <p>${new Date().toLocaleString()}</p>
          <p>${localOrder.order_type.toUpperCase()} - Table ${localOrder.restaurant_tables?.table_number || 'N/A'}</p>
        </div>
        <div class="items">
          ${(localOrder.order_items || []).map(item => `
            <div class="item">
              <span class="qty">${item.quantity}x</span>
              <span class="name">${item.item_name}</span>
            </div>
            ${item.notes ? `<div class="instructions">Note: ${item.notes}</div>` : ''}
          `).join('')}
        </div>
        ${localOrder.special_instructions ? `<div class="footer"><strong>Note:</strong> ${localOrder.special_instructions}</div>` : ''}
      </body>
      </html>
    `
        const win = window.open('', '', 'width=300,height=600')
        if (win) {
            win.document.write(printContent)
            win.document.close()
            win.print()
        }
    }

    return (
        <Dialog open={!!localOrder} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-none shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <span>Order #{localOrder.bill_id}</span>
                            <Badge>{localOrder.status}</Badge>
                        </DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={printKOT}>
                                <Printer className="mr-2 h-4 w-4" /> Print KOT
                            </Button>
                        </div>
                    </div>
                    <p className="flex items-center gap-4 text-sm mt-1 text-slate-600 font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {format(new Date(localOrder.created_at.includes('Z') || localOrder.created_at.includes('+') ? localOrder.created_at : localOrder.created_at + 'Z'), "h:mm a")}</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">Table {localOrder.restaurant_tables?.table_number || 'N/A'}</span>
                        <span className="uppercase font-extrabold tracking-wide text-primary">{localOrder.order_type.replace('_', ' ')}</span>
                    </p>
                </DialogHeader>

                <Separator />

                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Order Items</h3>
                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
                            ✓ Tick items as you prepare them
                        </p>
                    </div>
                    <div className="space-y-3">
                        {(localOrder.order_items || []).map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${item.status === 'ready'
                                    ? 'border-green-300 bg-green-50/50 opacity-60'
                                    : 'border-slate-200 bg-slate-50'
                                    }`}
                            >
                                <Checkbox
                                    id={`item-${item.id}`}
                                    checked={item.status === 'ready'}
                                    onCheckedChange={() => toggleItemComplete(item.id, item.status)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start gap-2">
                                        <label
                                            htmlFor={`item-${item.id}`}
                                            className={`font-bold cursor-pointer text-lg leading-none ${item.status === 'ready'
                                                ? 'line-through text-slate-500'
                                                : 'text-slate-900'
                                                }`}
                                        >
                                            <span className="font-extrabold text-primary mr-2">{item.quantity}x</span>
                                            {item.item_name}
                                        </label>
                                        {/* NEW badge for recently added items */}
                                        {(() => {
                                            if (!item.created_at) return null // No created_at, can't determine if new

                                            const now = new Date()
                                            const itemCreated = new Date(item.created_at.includes('Z') || item.created_at.includes('+') ? item.created_at : item.created_at + 'Z')
                                            const diffMinutes = Math.floor((now.getTime() - itemCreated.getTime()) / (1000 * 60))
                                            const isNew = diffMinutes < 5 // Item is new if added within last 5 minutes

                                            return isNew ? (
                                                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                                                    NEW
                                                </span>
                                            ) : null
                                        })()}
                                    </div>
                                    {item.notes && (
                                        <p className={`italic text-sm mt-1 ${item.status === 'ready'
                                            ? 'text-slate-400 line-through'
                                            : 'text-amber-600'
                                            }`}>
                                            Note: {item.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {localOrder.special_instructions && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                            <h4 className="font-bold flex items-center gap-2">
                                <span className="text-xl">⚠️</span> Special Instructions
                            </h4>
                            <p className="mt-1">{localOrder.special_instructions}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="destructive" size="sm" onClick={() => handleStatusChange('cancelled')}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel Order
                    </Button>
                    <div className="flex-1" />
                    {localOrder.status === 'pending' && (
                        <Button onClick={() => handleStatusChange('preparing')} className="bg-purple-600 hover:bg-purple-700">
                            <ChefHat className="mr-2 h-4 w-4" /> Start Cooking
                        </Button>
                    )}
                    {localOrder.status === 'confirmed' && (
                        <Button onClick={() => handleStatusChange('preparing')} className="bg-purple-600 hover:bg-purple-700">
                            <ChefHat className="mr-2 h-4 w-4" /> Start Cooking
                        </Button>
                    )}
                    {localOrder.status === 'preparing' && (
                        <Button onClick={() => handleStatusChange('ready')} className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20">
                            <Check className="mr-2 h-4 w-4" /> Mark Ready
                        </Button>
                    )}
                    {localOrder.status === 'ready' && (
                        <Button onClick={() => handleStatusChange('served')} className="bg-gray-700 hover:bg-gray-800">
                            <Check className="mr-2 h-4 w-4" /> Served
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
