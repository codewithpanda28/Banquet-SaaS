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

// 🚀 SaaS Reactive Strategy
// Using a Proxy ensures that existing code using RESTAURANT_ID constant
// always get the LATEST value from getRestaurantId() without needing a total refactor.
export const RESTAURANT_ID = new Proxy({}, {
    get: (_, prop) => {
        const id = getRestaurantId();
        if (prop === Symbol.toPrimitive) return () => id;
        if (prop === 'toString') return () => id;
        if (prop === 'valueOf') return () => id;
        if (prop === 'toLowerCase') return () => id.toLowerCase();
        if (prop === 'toStringTag') return () => 'String';
        // @ts-ignore - Handle string methods
        return typeof id[prop] === 'function' ? id[prop].bind(id) : id[prop];
    }
}) as unknown as string;
