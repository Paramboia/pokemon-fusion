'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="container max-w-md py-16">
      <div className="bg-muted p-8 rounded-lg text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-6">
          Your payment was cancelled and you have not been charged.
        </p>
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={() => router.push('/credits')}
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push('/')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 