import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import SaaSLandingPage from '@/components/saas/SaaSLandingPage';

export default async function Home() {
  const headersList = await headers();
  const isMainDomain = headersList.get('x-is-main-domain') === 'true';

  // If this is the main SaaS domain (e.g., restrosaas.com), show the marketing page
  if (isMainDomain) {
    return <SaaSLandingPage />;
  }

  // If this is a specific restaurant's custom domain (e.g., kfc.com),
  // they shouldn't see the SaaS marketing page. Send them to their menu.
  // In a full implementation, you'd fetch their ID and redirect directly to /customer/menu?domain=kfc.com
  redirect('/customer/menu');
}
