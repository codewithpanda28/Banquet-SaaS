'use client'

import React, { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { MenuCategory } from '@/types'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'

interface CategoryTabsProps {
    categories: MenuCategory[]
    activeCategory: string
    onSelect: (categoryId: string) => void
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Scroll active tab into view
        const activeTab = document.getElementById(`tab-${activeCategory}`)
        if (activeTab && containerRef.current) {
            const container = containerRef.current
            const tabLeft = activeTab.offsetLeft
            const tabWidth = activeTab.offsetWidth
            const containerWidth = container.offsetWidth

            container.scrollTo({
                left: tabLeft - containerWidth / 2 + tabWidth / 2,
                behavior: 'smooth'
            })
        }
    }, [activeCategory])

    return (
        <div className="w-full overflow-hidden transition-all duration-300">
            <div
                ref={containerRef}
                className="flex overflow-x-auto px-2 py-2 gap-2 no-scrollbar items-center touch-pan-x"
            >
                <button
                    id="tab-all"
                    onClick={() => onSelect('all')}
                    className={cn(
                        "relative shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 select-none active:scale-95",
                        activeCategory === 'all'
                            ? "bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20"
                            : "bg-white text-[#8B6508]/60 hover:bg-[#F4EBD0]/50 border border-[#D4AF37]/10"
                    )}
                >
                    All Items
                </button>

                {categories.map((category) => (
                    <button
                        key={category.id}
                        id={`tab-${category.id}`}
                        onClick={() => onSelect(category.id)}
                        className={cn(
                            "relative shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 select-none active:scale-95 flex items-center gap-2",
                            activeCategory === category.id
                                ? "text-white"
                                : "bg-white text-[#8B6508]/60 hover:bg-[#F4EBD0]/50 border border-[#D4AF37]/10"
                        )}
                    >
                        {category.name}
                        {activeCategory === category.id && (
                            <motion.div
                                layoutId="active-pill"
                                className="absolute inset-0 bg-[#D4AF37] rounded-full -z-10 shadow-lg shadow-[#D4AF37]/20"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
