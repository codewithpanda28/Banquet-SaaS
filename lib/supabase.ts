import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ SaaS Dynamic Restaurant ID
// Priority: URL SearchParam > Cookie (Client) > Env (Build/Fallback)
export const getRestaurantId = () => {
    // 🌐 Client Side
    if (typeof window !== 'undefined') {
        // 1. Check URL for direct ID access (Common for Vercel/Testing)
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');
        if (idParam) return idParam;

        // 2. Check Cookie (Previously set by Middleware)
        const cookies = document.cookie.split('; ');
        const tenantCookie = cookies.find(row => row.startsWith('tenant_id='));
        if (tenantCookie) return tenantCookie.split('=')[1];
    }

    // 🖥️ Server Side Fallback
    return process.env.NEXT_PUBLIC_RESTAURANT_ID!;
}

// ⚠️ Warning: Use getRestaurantId() directly in your code instead of this constant for SaaS reactivity
export const RESTAURANT_ID = getRestaurantId();
