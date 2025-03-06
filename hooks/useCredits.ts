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
  const [retryCount, setRetryCount] = useState(0);

  // Fetch the user's credit balance
  const fetchBalance = useCallback(async (retry = false) => {
    if (!isSignedIn || !isLoaded) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching credit balance...');
      
      // Get the authentication token
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication required');
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get('/api/credits/balance', { 
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Credit balance response:', response.data);
      setBalance(response.data.balance);
      setError(null);
      setRetryCount(0); // Reset retry count on success
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
          
          // If this is the first retry, try to refresh the token and try again
          if (!retry && retryCount < 3) {
            console.log(`Retrying credit balance fetch (attempt ${retryCount + 1})...`);
            setRetryCount(prev => prev + 1);
            
            // Wait a moment before retrying
            setTimeout(() => {
              fetchBalance(true);
            }, 1000);
            return;
          }
        } else if (err.response.status === 404) {
          setError('API endpoint not found or user not found in database.');
          console.log('User might not exist in Supabase database yet.');
          
          // If this is the first retry, try to sync the user and try again
          if (!retry && retryCount < 3) {
            console.log(`Retrying credit balance fetch after user sync (attempt ${retryCount + 1})...`);
            setRetryCount(prev => prev + 1);
            
            // Wait a moment before retrying
            setTimeout(() => {
              fetchBalance(true);
            }, 1000);
            return;
          }
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
  }, [isSignedIn, isLoaded, getToken, retryCount]);

  // Fetch available credit packages
  const fetchPackages = useCallback(async (retry = false) => {
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      
      // Try to fetch packages from the API
      try {
        // Get the authentication token if user is signed in
        let headers = {};
        if (isSignedIn) {
          const token = await getToken();
          if (token) {
            headers = { 'Authorization': `Bearer ${token}` };
          }
        }
        
        const response = await axios.get('/api/credits/packages', { 
          timeout: 5000,
          headers
        });
        
        if (response.data.packages && response.data.packages.length > 0) {
          setPackages(response.data.packages);
          setError(null);
          setRetryCount(0); // Reset retry count on success
          return;
        }
      } catch (apiErr: any) {
        console.error('Error fetching credit packages from API:', apiErr);
        
        // If this is the first retry and we got a 401 or 404, try again
        if (!retry && retryCount < 3 && 
            (apiErr.response?.status === 401 || apiErr.response?.status === 404)) {
          console.log(`Retrying credit packages fetch (attempt ${retryCount + 1})...`);
          setRetryCount(prev => prev + 1);
          
          // Wait a moment before retrying
          setTimeout(() => {
            fetchPackages(true);
          }, 1000);
          return;
        }
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
  }, [isLoaded, isSignedIn, getToken, retryCount]);

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