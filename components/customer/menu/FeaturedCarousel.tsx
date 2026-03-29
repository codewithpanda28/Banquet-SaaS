'use client'

import React from 'react'
import { MenuItem } from '@/types'
import { Crown, Sparkles, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FeaturedCarouselProps {
    items: MenuItem[]
    onAdd: (item: MenuItem) => void
}

export function FeaturedCarousel({ items, onAdd }: FeaturedCarouselProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const featuredItems = items.filter(i => i.is_bestseller || i.is_new)

    React.useEffect(() => {
        const container = scrollRef.current
        if (!container || featuredItems.length <= 1) return

        const isMobile = window.innerWidth < 640
        if (!isMobile) return

        let currentIndex = 0
        const interval = setInterval(() => {
            if (!container) return
            
            currentIndex = (currentIndex + 1) % featuredItems.length
            const scrollAmount = container.clientWidth * (0.85) + 16 // 85vw + gap (approx)
            
            // On very small devices, 85vw might vary. Better to calc exactly.
            const itemWidth = container.firstElementChild?.nextElementSibling?.clientWidth || 300
            const gap = 16
            
            container.scrollTo({
                left: currentIndex * (itemWidth + gap),
                behavior: 'smooth'
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [featuredItems.length])

    if (featuredItems.length === 0) return null

    return (
        <div className="pt-2 pb-1 space-y-2">
            <div className="px-2 flex items-center justify-between">
                <h2 className="text-lg font-black tracking-tight flex items-center gap-1.5 text-slate-900">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Recommended For You
                </h2>
            </div>

            <div 
                ref={scrollRef}
                className="flex overflow-x-auto px-4 gap-4 pb-4 no-scrollbar snap-x snap-mandatory scroll-smooth"
            >
                {featuredItems.map((item) => (
                    <div
                        key={item.id}
                        className="snap-center shrink-0 w-[85vw] sm:w-[300px] h-[200px] rounded-3xl relative overflow-hidden group shadow-lg shadow-black/5"
                        onClick={() => onAdd(item)}
                    >
                        {/* Background Image */}
                        <img
                            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        {item.is_bestseller && (
                                            <Badge className="bg-amber-500 text-black border-none text-[10px] px-2 h-5 hover:bg-amber-400">
                                                <Crown size={10} className="mr-1" />
                                                Bestseller
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg leading-tight mb-1 shadow-black drop-shadow-md">{item.name}</h3>
                                    <p className="font-bold text-xl text-amber-400 drop-shadow-sm">₹{item.price}</p>
                                </div>

                                <Button
                                    size="icon"
                                    className="rounded-full h-10 w-10 bg-white text-black hover:bg-white/90 shadow-xl"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAdd(item)
                                    }}
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
