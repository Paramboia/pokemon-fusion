import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthContext } from '@/contexts/auth-context';
import { toast } from 'sonner';

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  priceId: string;
};

export function useCredits() {
  const { isSignedIn, isLoaded } = useAuthContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's credit balance
  const fetchBalance = useCallback(async () => {
    if (!isSignedIn || !isLoaded) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching credit balance...');
      const response = await axios.get('/api/credits/balance', { timeout: 5000 });
      console.log('Credit balance response:', response.data);
      setBalance(response.data.balance);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching credit balance:', err);
      
      // Provide more detailed error messages based on the error type
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server might be busy.');
      } else if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError('Authentication error. Please sign in again.');
        } else if (err.response.status === 404) {
          setError('API endpoint not found or user not found in database.');
          console.log('User might not exist in Supabase database yet.');
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Failed to fetch credit balance');
      }
      
      // Set a fallback balance of 0
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded]);

  // Fetch available credit packages
  const fetchPackages = useCallback(async () => {
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      
      // Try to fetch packages from the API
      try {
        const response = await axios.get('/api/credits/packages', { timeout: 5000 });
        if (response.data.packages && response.data.packages.length > 0) {
          setPackages(response.data.packages);
          setError(null);
          return;
        }
      } catch (apiErr) {
        console.error('Error fetching credit packages from API:', apiErr);
      }
      
      // If API fails, use environment variables as fallback
      const fallbackPackages = [
        {
          id: 'starter',
          name: 'Starter Pack',
          credits: 5,
          price: 1.50,
          currency: 'EUR',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_CREDITS || '',
        },
        {
          id: 'standard',
          name: 'Standard Pack',
          credits: 20,
          price: 5.00,
          currency: 'EUR',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_20_CREDITS || '',
        },
        {
          id: 'value',
          name: 'Value Pack',
          credits: 50,
          price: 10.00,
          currency: 'EUR',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_50_CREDITS || '',
        }
      ];
      
      setPackages(fallbackPackages);
    } catch (err) {
      console.error('Error in fetchPackages:', err);
      setError('Failed to fetch credit packages');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  // Use credits for a fusion
  const useCredits = useCallback(async (description?: string) => {
    if (!isSignedIn || !isLoaded) {
      toast.error('You must be signed in to use credits');
      return false;
    }

    if (balance === 0) {
      toast.error('You have no credits left. Please purchase more.');
      return false;
    }

    try {
      const response = await axios.post('/api/credits/use', { description });
      setBalance(response.data.balance);
      return true;
    } catch (err: any) {
      if (err.response?.status === 402) {
        toast.error('Insufficient credits. Please purchase more.');
      } else {
        toast.error('Failed to use credits. Please try again.');
        console.error('Error using credits:', err);
      }
      return false;
    }
  }, [isSignedIn, isLoaded, balance]);

  // Create a checkout session for purchasing credits
  const createCheckoutSession = useCallback(async (priceId: string) => {
    if (!isSignedIn || !isLoaded) {
      toast.error('You must be signed in to purchase credits');
      return null;
    }

    try {
      const response = await axios.post('/api/credits/checkout', {
        priceId,
        successUrl: `${window.location.origin}/credits/success`,
        cancelUrl: `${window.location.origin}/credits/cancel`,
      });
      
      return response.data;
    } catch (err) {
      toast.error('Failed to create checkout session');
      console.error('Error creating checkout session:', err);
      return null;
    }
  }, [isSignedIn, isLoaded]);

  // Redirect to Stripe Checkout
  const redirectToCheckout = useCallback(async (priceId: string) => {
    const session = await createCheckoutSession(priceId);
    if (session?.url) {
      window.location.href = session.url;
    }
  }, [createCheckoutSession]);

  // Load initial data
  useEffect(() => {
    if (isLoaded) {
      fetchBalance();
      fetchPackages();
    }
  }, [isSignedIn, isLoaded, fetchBalance, fetchPackages]);

  return {
    balance,
    packages,
    isLoading,
    error,
    fetchBalance,
    fetchPackages,
    useCredits,
    createCheckoutSession,
    redirectToCheckout,
  };
} 