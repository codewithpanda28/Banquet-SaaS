import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import SaaSLandingPage from '@/components/saas/SaaSLandingPage';

// Server-side Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function fetchRealStats() {
  try {
    const [
      { count: totalRestaurants },
      { count: totalOrders },
      { count: totalCustomers },
      { data: revenueData },
      { count: totalStaff },
    ] = await Promise.all([
      supabaseAdmin.from('restaurants').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('total').eq('payment_status', 'paid'),
      supabaseAdmin.from('staff').select('*', { count: 'exact', head: true }),
    ]);

    const totalRevenue = revenueData?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

    return {
      totalRestaurants: totalRestaurants || 0,
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
      totalStaff: totalStaff || 0,
    };
  } catch (err) {
    console.error('[SaaS Page] Failed to fetch real stats:', err);
    return {
      totalRestaurants: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalRevenue: 0,
      totalStaff: 0,
    };
  }
}

export default async function Home() {
  const headersList = await headers();
  const isMainDomain = headersList.get('x-is-main-domain') === 'true';
  const host = headersList.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');

  if (isMainDomain || isLocalhost) {
    const stats = await fetchRealStats();
    return <SaaSLandingPage realStats={stats} />;
  }

  redirect('/customer/menu');
}

