"use client";

import { useEffect } from "react";

export default function TestPage() {
  useEffect(() => {
    console.log("Test page mounted");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="text-3xl font-bold mb-4">Test Page</h1>
      <p className="text-lg mb-8">This is a test page to diagnose rendering issues.</p>
      <div className="p-4 bg-blue-100 rounded-lg">
        <p>If you can see this page with the header and footer, the layout is working correctly.</p>
      </div>
    </div>
  );
} 