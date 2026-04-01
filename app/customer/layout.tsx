import type { Metadata } from "next"
import CustomerLayoutClient from "./layout-client"

export const metadata: Metadata = {
    title: "Restaurant Customer Portal",
    description: "Order delicious food from your table or for delivery",
}

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <CustomerLayoutClient>
            {children}
        </CustomerLayoutClient>
    )
}
