'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

// Loading component to display while the page is loading
function LoadingState() {
  return (
    <div className="container max-w-md py-16">
      <div className="bg-muted p-8 rounded-lg text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Processing Payment...</h1>
        <p className="text-muted-foreground mb-6">
          Please wait while we confirm your payment.
        </p>
      </div>
    </div>
  );
}

// The actual success content
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { fetchBalance } = useCredits();

  useEffect(() => {
    // Refresh the user's credit balance after a successful payment
    if (sessionId) {
      fetchBalance();
    }
  }, [sessionId, fetchBalance]);

  return (
    <div className="container max-w-md py-16">
      <div className="bg-muted p-8 rounded-lg text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for your purchase. Your credits have been added to your account.
        </p>
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={() => router.push('/credits')}
          >
            View My Credits
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

// Main page component with Suspense boundary
export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent />
    </Suspense>
  );
} 