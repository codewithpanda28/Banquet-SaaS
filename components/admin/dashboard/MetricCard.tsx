import { ReactElement } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: string | number
    icon: ReactElement
    change?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export function MetricCard({
    title,
    value,
    icon,
    change,
    className,
}: MetricCardProps) {
    return (
        <Card className={cn('', className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {change && (
                            <div className="flex items-center gap-1 text-xs">
                                {change.isPositive ? (
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                )}
                                <span
                                    className={cn(
                                        'font-medium',
                                        change.isPositive ? 'text-green-600' : 'text-red-600'
                                    )}
                                >
                                    {change.isPositive && '+'}
                                    {change.value}%
                                </span>
                                <span className="text-muted-foreground">vs yesterday</span>
                            </div>
                        )}
                    </div>
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
