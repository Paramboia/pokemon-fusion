import React from 'react';
import "../globals.css";

export default function StaticTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="container mx-auto">
          {children}
        </div>
      </body>
    </html>
  );
} 