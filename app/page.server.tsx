import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the client component with no SSR
const HomeClient = dynamic(() => import('./index-page'), { ssr: false });

export default function HomePage() {
  return (
    <div>
      <HomeClient />
    </div>
  );
} 