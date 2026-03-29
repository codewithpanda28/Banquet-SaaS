import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 🚀 SaaS Dynamic Restaurant ID
// Priority: URL SearchParam > localStorage > Cookie > Env Fallback
export const getRestaurantId = () => {
    // 🌐 Client Side
    if (typeof window !== 'undefined') {
        // 1. Check URL (Highest Priority for specific access)
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');
        if (idParam) {
            // Persist the specific ID selected
            document.cookie = `tenant_id=${idParam}; path=/; max-age=86400`;
            localStorage.setItem('tenant_id', idParam);
            return idParam;
        }

        // 2. Check localStorage (Session stickiness)
        const localId = localStorage.getItem('tenant_id');
        if (localId) return localId;

        // 3. Check Cookie
        const cookies = document.cookie.split('; ');
        const tenantCookie = cookies.find(row => row.startsWith('tenant_id='));
        if (tenantCookie) return tenantCookie.split('=')[1];
    }

    // 🖥️ Server Side Fallback
    return process.env.NEXT_PUBLIC_RESTAURANT_ID || '';
}

// 🚀 SaaS Static-Reactive ID
// We export the ID as a string-serialized result. 
// Note: In client components, this will re-evaluate on every import/call.
export const RESTAURANT_ID = typeof window !== 'undefined' ? getRestaurantId() : (process.env.NEXT_PUBLIC_RESTAURANT_ID || '');
