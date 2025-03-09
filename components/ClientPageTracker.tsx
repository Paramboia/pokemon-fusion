'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { pageview } from '@/lib/gtag';

// Inner component that uses the hooks
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Construct the full URL including search parameters
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      // Track the page view
      pageview(url);
      
      // For debugging
      console.log(`[Analytics] Page view tracked: ${url}`);
    }
  }, [pathname, searchParams]);

  return null;
}

// Wrapper component with Suspense
export function ClientPageTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
} 