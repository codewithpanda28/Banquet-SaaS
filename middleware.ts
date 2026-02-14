import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protected routes
    if (pathname.startsWith('/admin')) {
        // Check if logged in (we'll verify on client side)
        // For now, just allow access (client-side protection is in place)
        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
