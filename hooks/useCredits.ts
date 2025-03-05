import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
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
  const { isSignedIn, isLoaded } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's credit balance
  const fetchBalance = useCallback(async () => {
    if (!isSignedIn || !isLoaded) return;

    try {
      setIsLoading(true);
      const response = await axios.get('/api/credits/balance');
      setBalance(response.data.balance);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit balance:', err);
      setError('Failed to fetch credit balance');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded]);

  // Fetch available credit packages
  const fetchPackages = useCallback(async () => {
    if (!isSignedIn || !isLoaded) return;

    try {
      setIsLoading(true);
      const response = await axios.get('/api/credits/packages');
      setPackages(response.data.packages);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit packages:', err);
      setError('Failed to fetch credit packages');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded]);

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
    if (isSignedIn && isLoaded) {
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