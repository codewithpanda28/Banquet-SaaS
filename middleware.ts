import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Only for middleware, needs to be lightweight)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const isMainDomain = hostname === MAIN_DOMAIN;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-current-domain', hostname);
  requestHeaders.set('x-is-main-domain', isMainDomain ? 'true' : 'false');

  // 🆔 ALWAYS Check for ?id= Search Parameter (Universal Overrider)
  const idFromUrl = url.searchParams.get('id');
  
  // 🏷️ Admin Login Redirect (Fix 404)
  // We handle this FIRST to ensure the redirect happens regardless of ?id= param
  if (url.pathname === '/admin/login') {
    const loginUrl = new URL('/login', req.url);
    if (idFromUrl) loginUrl.searchParams.set('id', idFromUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (idFromUrl) {
    const response = NextResponse.next();
    response.cookies.set('tenant_id', idFromUrl, { path: '/', httpOnly: false });
    return response;
  }

  if (!isMainDomain) {
    // 🔍 SaaS Lookup: Detect restaurant by domain OR slug
    const hostWithoutPort = hostname.split(':')[0];
    const subdomain = hostWithoutPort.includes('.') ? hostWithoutPort.split('.')[0] : hostWithoutPort;
    
    // Attempt 1: Check Custom Domain
    let { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug, name, primary_color')
      .eq('custom_domain', hostWithoutPort)
      .maybeSingle();

    // Attempt 2: Check Slug (if not found by domain)
    if (!restaurant) {
      const { data: bySlug } = await supabase
        .from('restaurants')
        .select('id, slug, name, primary_color')
        .eq('slug', subdomain)
        .maybeSingle();
      restaurant = bySlug;
    }

    if (restaurant) {
      requestHeaders.set('x-restaurant-id', restaurant.id);
      requestHeaders.set('x-restaurant-slug', restaurant.slug);
      requestHeaders.set('x-restaurant-name', restaurant.name);
      requestHeaders.set('x-primary-color', restaurant.primary_color || '#ef4444');
      requestHeaders.set('x-tenant-found', 'true');

      // Set cookie for client-side access
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      response.cookies.set('tenant_id', restaurant.id, { path: '/', httpOnly: false });
      response.cookies.set('tenant_slug', restaurant.slug, { path: '/', httpOnly: false });
      return response;
    } else {
        requestHeaders.set('x-tenant-found', 'false');
        requestHeaders.set('x-debug-subdomain', subdomain);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Apply middleware to all routes except api, _next, static files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
