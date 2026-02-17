
import KitchenClientLayout from "@/components/kitchen/KitchenClientLayout";

export const metadata = {
    title: "Kitchen Dashboard",
    description: "Real-time kitchen order management system",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <KitchenClientLayout>{children}</KitchenClientLayout>;
}
