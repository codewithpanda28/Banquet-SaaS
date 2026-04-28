'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { toast } from 'sonner'
import { Minus, Plus, Flame, ChefHat } from 'lucide-react'
import { useRestaurant } from '@/hooks/useRestaurant'

interface MenuItemModalProps {
    item: MenuItem | null
    isOpen: boolean
    onClose: () => void
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
    const [quantity, setQuantity] = useState(1)
    const [instructions, setInstructions] = useState('')
    const { addItem } = useCartStore()
    const { restaurant } = useRestaurant()

    useEffect(() => {
        if (isOpen) {
            setQuantity(1)
            setInstructions('')
        }
    }, [isOpen])

    if (!item) return null

    const handleAddToCart = () => {
        addItem(item, quantity, instructions)
        toast.success(
            <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-green-500" />
                <span className="font-bold">Added to Order!</span>
            </div>
        )
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 rounded-2xl shadow-xl bg-white max-h-[90vh] flex flex-col">

                {/* Scrollable Content Area */}
                <div className="overflow-y-auto flex-1">
                    {/* Hero Image */}
                    <div className="relative h-64 w-full bg-gray-100">
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ChefHat className="w-12 h-12 opacity-20" />
                            </div>
                        )}

                        {/* WebAR Button (Demo) */}
                        {item.ar_model_url && (
                            <a
                                href={item.ar_model_url || "https://arvr.google.com/scene-viewer?file=https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF/Avocado.gltf&title=" + encodeURIComponent(item.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white backdrop-blur-md text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12.338 21.994c.219.018.443-.009.662-.08a1.64 1.64 0 0 0 1.056-1.047l2.185-6.6a1.27 1.27 0 0 1 .42-.587l.088-.06a1.27 1.27 0 0 1 .693-.26h.225a3.67 3.67 0 0 1 2.333 6.643c.96.004 1.918-.088 2.871-.275a2.03 2.03 0 0 0 1.626-2.148c-.148-1.745-.487-3.483-1.012-5.176l-.014-.043a28.025 28.025 0 0 0-1.898-4.482l-.027-.052a26.155 26.155 0 0 0-4.04-5.263l-.043-.04A3.496 3.496 0 0 0 15.01 1.01a4.25 4.25 0 0 0-2.327.93l-.448.358a.465.465 0 0 1-.586.002l-.454-.363a4.25 4.25 0 0 0-2.321-.926 3.496 3.496 0 0 0-2.433 1.03l-.048.05a26.155 26.155 0 0 0-4.04 5.263l-.027.052a28.09 28.09 0 0 0-1.898 4.481l-.014.044c-.525 1.693-.864 3.43-1.012 5.176a2.03 2.03 0 0 0 1.626 2.148 14.507 14.507 0 0 0 2.871.275 3.67 3.67 0 0 1 2.333-6.643h.225c.24.004.478.093.665.25l.116.07a1.27 1.27 0 0 1 .42.587l2.185 6.6a1.64 1.64 0 0 0 1.056 1.047c.22.071.443.098.662.08Z" /></svg>
                                View in 3D Live
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-sm z-10"
                        >
                            <span className="text-xl leading-none">&times;</span>
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between items-start gap-3">
                                <DialogTitle className="text-2xl font-black leading-tight text-foreground">{item.name}</DialogTitle>
                                <div className="flex flex-col items-end shrink-0 hidden">
                                    {item.discounted_price ? (
                                        <>
                                            <span className="text-sm text-muted-foreground line-through decoration-red-500/50">₹{item.price}</span>
                                            <span className="text-xl font-black text-primary">₹{item.discounted_price}</span>
                                        </>
                                    ) : (
                                        <span className="text-xl font-black text-primary">₹{item.price}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {item.is_veg ? (
                                    <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" /> Veg
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-red-600 text-red-700 bg-red-50 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" /> Non-Veg
                                    </Badge>
                                )}
                                {item.is_bestseller && (
                                    <Badge className="bg-amber-400 text-black border-none px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider">Bestseller</Badge>
                                )}
                                {item.is_spicy && (
                                    <Badge variant="secondary" className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider gap-1 text-orange-600 bg-orange-50">
                                        <Flame className="w-3 h-3 fill-orange-500" /> Spicy
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <DialogDescription className="text-muted-foreground leading-relaxed text-sm">
                            {item.description}
                        </DialogDescription>

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
                                Special Requests (Optional)
                            </label>
                            <Input
                                placeholder="e.g. Less spicy, extra sauce..."
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                className="bg-gray-50 border-gray-200 focus:bg-white focus:border-primary h-11 rounded-xl transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 bg-white border-t flex items-center gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex items-center bg-gray-100 rounded-xl px-2 h-12 shrink-0">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-10 h-full flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                        <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-10 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <Button
                        onClick={handleAddToCart}
                        className="flex-1 h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all"
                    >
                        Add to Order
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
