import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function generateBillId() {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BILL${timestamp}${random}`
}
