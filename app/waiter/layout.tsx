
export const metadata = {
    title: "Waiter Dashboard",
    description: "Real-time waiter order management system",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}
