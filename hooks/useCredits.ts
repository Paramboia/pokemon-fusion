import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthContext } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase-client';

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
  const { getToken } = useAuth();
  const { user } = useUser();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!user?.id) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('credits_balance')
        .eq('clerk_id', user.id)
        .single();

      if (supabaseError) {
        console.error('Error fetching balance:', supabaseError);
        setError('Failed to fetch credit balance');
        setBalance(null);
        return;
      }

      setBalance(data?.credits_balance ?? 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch credit balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Only depend on user.id

  // Fetch available credit packages
  const fetchPackages = useCallback(async () => {
    if (!isSignedIn || !isLoaded) {
      setPackages(getFallbackPackages());
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching credit packages...');
      
      const token = await getToken();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get('/api/credits/packages', { 
        timeout: 8000,
        headers
      });
      
      if (response.data.packages?.length > 0) {
        setPackages(response.data.packages);
        setError(null);
      } else {
        setPackages(getFallbackPackages());
      }
    } catch (err) {
      console.error('Error fetching credit packages:', err);
      setPackages(getFallbackPackages());
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded, getToken]);

  // Helper function to get fallback packages
  const getFallbackPackages = () => [
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
    
    if (balance === null) {
      toast.error('Unable to determine your credit balance. Please try again later.');
      return false;
    }

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication required. Please sign in again.');
        return false;
      }
      
      const response = await axios.post('/api/credits/use', 
        { description },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
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
  }, [isSignedIn, isLoaded, balance, getToken]);

  // Create a checkout session for purchasing credits
  const createCheckoutSession = useCallback(async (priceId: string) => {
    if (!isSignedIn || !isLoaded) {
      toast.error('You must be signed in to purchase credits');
      return null;
    }

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication required. Please sign in again.');
        return null;
      }
      
      const response = await axios.post('/api/credits/checkout', 
        {
          priceId,
          successUrl: `${window.location.origin}/home`,
          cancelUrl: `${window.location.origin}/credits`,
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      return response.data;
    } catch (err) {
      toast.error('Failed to create checkout session');
      console.error('Error creating checkout session:', err);
      return null;
    }
  }, [isSignedIn, isLoaded, getToken]);

  // Redirect to Stripe Checkout
  const redirectToCheckout = useCallback(async (priceId: string) => {
    const session = await createCheckoutSession(priceId);
    if (session?.url) {
      window.location.href = session.url;
    }
  }, [createCheckoutSession]);

  // Single effect to load initial data
  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchBalance();
      fetchPackages();
    }
  }, [isLoaded, user?.id, fetchBalance, fetchPackages]);

  return {
    balance,
    packages,
    isLoading,
    error,
    useCredits,
    redirectToCheckout,
    fetchBalance,
    fetchPackages
  };
} 