import { Plus_Jakarta_Sans } from 'next/font/google'
import { Header } from '@/components/customer/layout/Header'
import { CartSidebar } from '@/components/customer/cart/CartSidebar'
import { FloatingCartButton } from '@/components/customer/cart/FloatingCartButton'
import { Toaster } from '@/components/ui/sonner'
import { GlobalUpsell } from '@/components/customer/menu/GlobalUpsell'
import { cn } from '@/lib/utils'

const font = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata = {
    title: 'Restaurant - Customer',
    description: 'Order food online',
}

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={cn(font.className, "min-h-screen overflow-x-hidden")}>
            <Header />
            <main className="pb-32 min-h-screen bg-gray-50/50 overflow-x-hidden">
                {children}
            </main>
            <CartSidebar />
            <FloatingCartButton />
            <Toaster position="top-center" richColors />

            {/* AI Upsell Modal (Client Component) */}
            <GlobalUpsell />
        </div>
    )
}
