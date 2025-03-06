import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthContext } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

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
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's credit balance
  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching credit balance...');
      
      // Get the authentication token if user is signed in
      let headers = {};
      if (isSignedIn && isLoaded) {
        const token = await getToken();
        if (token) {
          headers = { 'Authorization': `Bearer ${token}` };
        }
      }
      
      const response = await axios.get('/api/credits/balance', { 
        timeout: 8000, // Increased timeout
        headers
      });
      
      console.log('Credit balance response:', response.data);
      setBalance(response.data.balance);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching credit balance:', err);
      
      // Provide more detailed error messages based on the error type
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server might be busy.');
      } else if (err.response) {
        setError(`Server error: ${err.response.status}`);
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Failed to fetch credit balance');
      }
      
      // Keep balance as null to display "?" instead of 0
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded, getToken]);

  // Fetch available credit packages
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching credit packages...');
      
      // Get the authentication token if user is signed in
      let headers = {};
      if (isSignedIn && isLoaded) {
        const token = await getToken();
        if (token) {
          headers = { 'Authorization': `Bearer ${token}` };
        }
      }
      
      const response = await axios.get('/api/credits/packages', { 
        timeout: 8000, // Increased timeout
        headers
      });
      
      if (response.data.packages && response.data.packages.length > 0) {
        console.log('Credit packages response:', response.data.packages);
        setPackages(response.data.packages);
        setError(null);
      } else {
        // Use fallback packages if API returns empty array
        console.log('Using fallback packages (empty response)');
        setPackages(getFallbackPackages());
      }
    } catch (err) {
      console.error('Error fetching credit packages:', err);
      setError('Failed to fetch credit packages');
      
      // Use fallback packages on error
      console.log('Using fallback packages (error)');
      setPackages(getFallbackPackages());
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Helper function to get fallback packages
  const getFallbackPackages = () => {
    return [
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
  };

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
      // Get the authentication token
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication required. Please sign in again.');
        return false;
      }
      
      const response = await axios.post('/api/credits/use', 
        { description },
        { 
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
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
      // Get the authentication token
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication required. Please sign in again.');
        return null;
      }
      
      const response = await axios.post('/api/credits/checkout', 
        {
          priceId,
          successUrl: `${window.location.origin}/credits/success`,
          cancelUrl: `${window.location.origin}/credits/cancel`,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
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

  // Load initial data
  useEffect(() => {
    if (isLoaded) {
      fetchBalance();
      fetchPackages();
    }
  }, [isLoaded, fetchBalance, fetchPackages]);

  // Refresh data when user signs in or out
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
    useCredits,
    redirectToCheckout,
    fetchBalance,
    fetchPackages
  };
} 