'use client'

import { ReactNode } from 'react'

/**
 * 🔒 AdminGuard (DEPRECATED LOCK)
 * The user requested to remove the secondary passcode screen.
 * This component now directly renders children to maintain system compatibility
 * without interrupting the administrative workflow.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
    // Secondary passcode check has been disabled by user request.
    // The system now relies solely on the primary Admin Login.
    return <>{children}</>
}
