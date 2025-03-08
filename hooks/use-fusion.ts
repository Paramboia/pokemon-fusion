"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

export function useFusion() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { isLoaded, user } = useUser()
  const [generating, setGenerating] = useState(false)
  const [fusionImage, setFusionImage] = useState<string | null>(null)
  const [fusionId, setFusionId] = useState<string | null>(null)
  const [fusionName, setFusionName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPaymentRequired, setIsPaymentRequired] = useState(false)
  const [isLocalFallback, setIsLocalFallback] = useState(false)

  const generateFusion = async (image1Url: string, image2Url: string, name1: string, name2: string, pokemon1Id: number, pokemon2Id: number) => {
    try {
      // Reset state
      setGenerating(true)
      setError(null)
      setIsPaymentRequired(false)
      setIsLocalFallback(false)
      setFusionId(null)
      setFusionName(null)
      setFusionImage(null)

      // Wait for user to be loaded
      if (!isLoaded || !user) {
        console.error('User not loaded');
        toast.error('Please sign in to generate fusions');
        setError('Authentication required');
        setGenerating(false);
        return;
      }

      console.log('Generating fusion for:', { name1, name2, pokemon1Id, pokemon2Id })

      // Get the Clerk session token
      const token = await getToken()
      console.log('Got authentication token:', token ? 'Yes' : 'No')
      
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication error. Please refresh and try again.');
        setError('Authentication error');
        setGenerating(false);
        return;
      }

      // Create a fusion name by combining parts of both Pokémon names
      const generatedFusionName = `${name1}-${name2}`;

      // Show a toast to indicate generation has started
      toast.loading('Starting Pokémon fusion generation...', {
        id: 'fusion-generation',
        duration: 60000, // 60 seconds
      })

      // Set a timeout for the API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 50000) // 50 second timeout

      try {
        // Check credits balance directly from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('credits_balance')
          .eq('clerk_id', user.id)
          .single()

        if (userError || !userData) {
          console.error('Failed to fetch credits balance:', userError);
          toast.dismiss('fusion-generation');
          toast.error('Unable to verify credits. Showing first Pokémon instead.');
          setError('Unable to verify credits');
          setFusionImage(image1Url);
          setIsLocalFallback(true);
          setFusionName(name1);
          setGenerating(false);
          return;
        }

        if (userData.credits_balance === 0) {
          toast.dismiss('fusion-generation');
          setIsPaymentRequired(true);
          toast.error('No credits available. Please purchase more credits.');
          setError('No credits available. Please purchase more credits.');
          setGenerating(false);
          return;
        }

        // Call the API endpoint to generate the fusion
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Simple-Fusion': 'false', // Default to AI fusion
          },
          credentials: 'include',
          body: JSON.stringify({
            pokemon1Id,
            pokemon2Id,
            pokemon1Name: name1,
            pokemon2Name: name2,
            fusionName: generatedFusionName
          }),
          signal: controller.signal
        })

        // Clear the timeout
        clearTimeout(timeoutId)

        // Check if the response is successful before parsing JSON
        if (!response.ok) {
          let errorMessage = 'Failed to generate fusion';
          
          try {
            // Try to parse the error response as JSON
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            console.error('Error details:', errorData.details);
          } catch (parseError) {
            // If JSON parsing fails, use the status text
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          
          console.error('Error generating fusion:', errorMessage, 'Status:', response.status);
          
          // Dismiss the loading toast
          toast.dismiss('fusion-generation')
          
          if (response.status === 401) {
            toast.error('Authentication error. Please refresh the page and try again.');
            setError('Authentication error');
          } else if (response.status === 402) {
            setIsPaymentRequired(true);
            toast.error('Payment required to generate more fusions');
            setError('Payment required to generate more fusions');
          } else {
            // For any other error, use the simple fallback (first Pokemon's image)
            toast.error('Unable to generate fusion. Showing first Pokémon instead.');
            setError('Fusion generation is currently unavailable');
            setFusionImage(image1Url);
            setIsLocalFallback(true);
            setFusionName(name1);
          }
          
          setGenerating(false);
          return;
        }

        // Parse the response
        let data;
        try {
          data = await response.json();
          console.log('Fusion API response:', data);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          toast.dismiss('fusion-generation')
          toast.error('Unable to generate fusion. Showing first Pokémon instead.');
          setError('Failed to parse server response');
          setFusionImage(image1Url);
          setIsLocalFallback(true);
          setFusionName(name1);
          setGenerating(false);
          return;
        }

        // Dismiss the loading toast
        toast.dismiss('fusion-generation')

        // Set the fusion data
        console.log('Fusion generated successfully:', data);
        setFusionImage(data.output || data.fusionImage);
        setFusionId(data.id);
        setIsLocalFallback(data.isLocalFallback || false);
        setFusionName(data.fusionName || generatedFusionName);
        
        // Show appropriate success message
        if (data.isLocalFallback) {
          toast.success('Showing simplified fusion.');
        } else {
          toast.success('AI Fusion generated successfully!');
        }
      } catch (fetchError) {
        // Clear the timeout
        clearTimeout(timeoutId)
        
        console.error('Error in fetch:', fetchError);
        toast.dismiss('fusion-generation')
        
        // For any fetch error, use the simple fallback (first Pokemon's image)
        toast.error('Unable to generate fusion. Showing first Pokémon instead.');
        setError('An unexpected error occurred');
        setFusionImage(image1Url);
        setIsLocalFallback(true);
        setFusionName(name1);
      }
    } catch (err) {
      console.error('Error in generateFusion:', err);
      toast.dismiss('fusion-generation')
      setError('An unexpected error occurred');
      toast.error('Unable to generate fusion. Showing first Pokémon instead.');
      setFusionImage(image1Url);
      setIsLocalFallback(true);
      setFusionName(name1);
    } finally {
      setGenerating(false);
    }
  }

  return {
    generating,
    fusionImage,
    fusionId,
    fusionName,
    error,
    isPaymentRequired,
    isLocalFallback,
    generateFusion,
    handlePaymentRequired: () => {
      if (isPaymentRequired) {
        router.push('/credits')
      }
    }
  }
} 