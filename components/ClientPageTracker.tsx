'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { pageview } from '@/lib/gtag';

export function ClientPageTracker() {
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

  // This component doesn't render anything
  return null;
} 