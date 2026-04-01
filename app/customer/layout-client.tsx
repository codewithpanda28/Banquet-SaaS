'use client'

import { Plus_Jakarta_Sans } from 'next/font/google'
import { Header } from '@/components/customer/layout/Header'
import { CartSidebar } from '@/components/customer/cart/CartSidebar'
import { FloatingCartButton } from '@/components/customer/cart/FloatingCartButton'
import { Toaster } from '@/components/ui/sonner'
import { GlobalUpsell } from '@/components/customer/menu/GlobalUpsell'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

const font = Plus_Jakarta_Sans({ subsets: ['latin'] })

export default function CustomerLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isReviewPage = pathname === '/customer/review'

    return (
        <div className={cn(font.className, "min-h-screen overflow-x-hidden")}>
            {!isReviewPage && <Header />}
            <main className={cn("min-h-screen bg-gray-50/50 overflow-x-hidden", !isReviewPage && "pb-32")}>
                {children}
            </main>
            {!isReviewPage && (
                <>
                    <CartSidebar />
                    <FloatingCartButton />
                    <GlobalUpsell />
                </>
            )}
            <Toaster position="top-center" richColors />
        </div>
    )
}
