
"use client"

import { useEffect, useState } from "react"
import { differenceInMinutes, format } from "date-fns"

interface OrderTimerProps {
    createdAt: string
}

import { useKitchenStore } from "@/store/kitchenStore"

export default function OrderTimer({ createdAt }: OrderTimerProps) {
    const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 })
    const threshold = useKitchenStore((state) => state.prepTimeThreshold)
    const [totalMinutes, setTotalMinutes] = useState(0)

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date()
            const start = new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z')
            const diff = Math.max(0, now.getTime() - start.getTime())

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setElapsed({ hours, minutes, seconds })
            setTotalMinutes(Math.floor(diff / (1000 * 60)))
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000) // Update every second

        return () => clearInterval(interval)
    }, [createdAt])

    let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-300"
    if (totalMinutes >= threshold / 2) colorClass = "text-amber-700 bg-amber-50 border-amber-300"
    if (totalMinutes >= threshold) colorClass = "text-red-700 bg-red-50 border-red-300 animate-pulse font-bold"

    // Format order time
    const orderTime = format(new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z'), 'h:mm a')

    return (
        <div className="flex flex-col items-end gap-1">
            <span className={`text-sm font-mono font-bold px-2.5 py-1 rounded-md border-2 ${colorClass}`}>
                {elapsed.hours > 0 ? `${elapsed.hours}:` : ''}{elapsed.minutes.toString().padStart(2, '0')}:{elapsed.seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                Ordered: {orderTime}
            </span>
        </div>
    )
}
