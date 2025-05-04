import React from 'react';

export default function TestRoute() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Test Route Working</h1>
      <p className="text-xl mb-8">If you can see this page, routing is working correctly!</p>
      <div className="p-4 bg-green-100 rounded-lg border border-green-300">
        <p className="text-green-700">
          This is a test page created to verify that the Next.js App Router is functioning properly.
        </p>
      </div>
    </div>
  );
} 