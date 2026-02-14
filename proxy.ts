import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    // If user is not signed in and the current path starts with /admin, redirect to /login
    if (!session && req.nextUrl.pathname.startsWith('/admin')) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is signed in and trying to access /login, redirect to /admin
    if (session && req.nextUrl.pathname.startsWith('/login')) {
        const url = req.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
    }

    return res
}

export const config = {
    matcher: ['/admin/:path*', '/login'],
}
