import React from 'react';
import Link from 'next/link';

export default function StaticTestPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Static Test Page</h1>
      <p className="text-xl mb-8">This is a server component that should render properly.</p>
      
      <div className="p-4 bg-green-100 rounded-lg border border-green-300 mb-8">
        <p className="text-green-700">
          If you can see this page, the Next.js App Router is functioning correctly!
        </p>
      </div>
      
      <Link href="/" className="text-blue-500 hover:underline">
        Go back to home
      </Link>
    </div>
  );
} 