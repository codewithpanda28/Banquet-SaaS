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
                        "relative shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 select-none active:scale-95",
                        activeCategory === 'all'
                            ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                            : "bg-white text-slate-500 hover:bg-slate-50 shadow-sm border border-gray-100"
                    )}
                >
                    All
                </button>

                {categories.map((category) => (
                    <button
                        key={category.id}
                        id={`tab-${category.id}`}
                        onClick={() => onSelect(category.id)}
                        className={cn(
                            "relative shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 select-none active:scale-95 flex items-center gap-2",
                            activeCategory === category.id
                                ? "text-white"
                                : "bg-white text-slate-500 hover:bg-slate-50 shadow-sm border border-gray-100"
                        )}
                    >
                        {category.name}
                        {activeCategory === category.id && (
                            <motion.div
                                layoutId="active-pill"
                                className="absolute inset-0 bg-orange-600 rounded-2xl -z-10 shadow-lg shadow-orange-600/20"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
