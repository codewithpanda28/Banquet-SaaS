
"use client"

import { Order, OrderItem } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useKitchenStore } from "@/store/kitchenStore"
import { Separator } from "@/components/ui/separator"
import { Check, ChefHat, Printer, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"

import { updateOrderItemStatus } from "@/services/orderService"

interface OrderDetailsProps {
    order: Order | null
    onClose: () => void
}

export default function OrderDetails({ order, onClose }: OrderDetailsProps) {
    const { updateOrder } = useKitchenStore()

    if (!order) return null

    const handleStatusChange = (status: Order["status"]) => {
        updateOrder(order.id, { status })
        onClose()
    }

    const toggleItemComplete = (itemId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ready' ? 'pending' : 'ready'
        updateOrderItemStatus(itemId, newStatus)
        // Optimistic update in store could happen here but realtime will handle it shortly
    }

    const printKOT = () => {
        const printContent = `
      <html>
      <head>
        <title>KOT - ${order.bill_id}</title>
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
          <p>#${order.bill_id}</p>
          <p>${new Date().toLocaleString()}</p>
          <p>${order.order_type.toUpperCase()} - Table ${order.restaurant_tables?.table_number || 'N/A'}</p>
        </div>
        <div class="items">
          ${(order.order_items || []).map(item => `
            <div class="item">
              <span class="qty">${item.quantity}x</span>
              <span class="name">${item.item_name}</span>
            </div>
            ${item.special_instructions ? `<div class="instructions">Note: ${item.special_instructions}</div>` : ''}
          `).join('')}
        </div>
        ${order.special_instructions ? `<div class="footer"><strong>Note:</strong> ${order.special_instructions}</div>` : ''}
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
        <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-none shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <span>Order #{order.bill_id}</span>
                            <Badge>{order.status}</Badge>
                        </DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={printKOT}>
                                <Printer className="mr-2 h-4 w-4" /> Print KOT
                            </Button>
                        </div>
                    </div>
                    <p className="flex items-center gap-4 text-sm mt-1 text-slate-600 font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {format(new Date(order.created_at), "h:mm a")}</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">Table {order.restaurant_tables?.table_number || 'N/A'}</span>
                        <span className="uppercase font-extrabold tracking-wide text-primary">{order.order_type.replace('_', ' ')}</span>
                    </p>
                </DialogHeader>

                <Separator />

                <div className="py-4 space-y-4">
                    <h3 className="font-semibold text-lg">Order Items</h3>
                    <div className="space-y-3">
                        {(order.order_items || []).map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                <Checkbox
                                    id={`item-${item.id}`}
                                    checked={item.status === 'ready'}
                                    onCheckedChange={() => toggleItemComplete(item.id, item.status)}
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <label htmlFor={`item-${item.id}`} className="font-bold cursor-pointer text-lg leading-none text-slate-900">
                                            <span className="font-extrabold text-primary mr-2">{item.quantity}x</span>
                                            {item.item_name}
                                        </label>
                                    </div>
                                    {item.special_instructions && (
                                        <p className="text-amber-600 italic text-sm mt-1">Note: {item.special_instructions}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {order.special_instructions && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                            <h4 className="font-bold flex items-center gap-2">
                                <span className="text-xl">⚠️</span> Special Instructions
                            </h4>
                            <p className="mt-1">{order.special_instructions}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="destructive" onClick={() => handleStatusChange('cancelled')}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel Order
                    </Button>
                    <div className="flex-1" />
                    {order.status === 'pending' && (
                        <Button onClick={() => handleStatusChange('confirmed')} className="bg-blue-600 hover:bg-blue-700">
                            <Check className="mr-2 h-4 w-4" /> Accept Order
                        </Button>
                    )}
                    {order.status === 'confirmed' && (
                        <Button onClick={() => handleStatusChange('preparing')} className="bg-purple-600 hover:bg-purple-700">
                            <ChefHat className="mr-2 h-4 w-4" /> Start Cooking
                        </Button>
                    )}
                    {order.status === 'preparing' && (
                        <Button onClick={() => handleStatusChange('ready')} className="bg-green-600 hover:bg-green-700">
                            <Check className="mr-2 h-4 w-4" /> Mark Ready
                        </Button>
                    )}
                    {order.status === 'ready' && (
                        <Button onClick={() => handleStatusChange('served')} className="bg-gray-600 hover:bg-gray-700">
                            <Check className="mr-2 h-4 w-4" /> Served
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
