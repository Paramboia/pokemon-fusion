"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { event as gaEvent } from '@/lib/gtag'

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

  const generateFusion = async (
    image1Url: string, 
    image2Url: string, 
    name1: string, 
    name2: string, 
    pokemon1Id: number, 
    pokemon2Id: number,
    fusionName?: string
  ) => {
    try {
      // Reset state
      setGenerating(true)
      setError(null)
      setIsPaymentRequired(false)
      setIsLocalFallback(false)
      setFusionId(null)
      setFusionName(null)
      setFusionImage(null)

      // Track fusion generation start
      gaEvent({
        action: 'fusion_generation_start',
        category: 'engagement',
        label: `${name1}-${name2}`,
        value: undefined
      });

      // Wait for user to be loaded
      if (!isLoaded || !user) {
        console.error('User not loaded');
        toast.error('Please sign in to generate fusions');
        setError('Authentication required');
        setGenerating(false);
        return;
      }

      console.log('Generating fusion for:', { name1, name2, pokemon1Id, pokemon2Id, fusionName })

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

      // Use provided fusion name or create a default one
      const generatedFusionName = fusionName || `${name1}-${name2}`;

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
          toast.error('Please purchase more credits to generate more amazing Pokémon fusions.');
          setError('Please purchase more credits to generate more amazing Pokémon fusions.');
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
        
        // DEBUG: Log details about isLocalFallback flag
        console.log('DEBUG isLocalFallback:', {
          isPropertyPresent: 'isLocalFallback' in data,
          valueInResponse: data.isLocalFallback,
          valueAfterFallback: data.isLocalFallback || false,
          valueType: typeof data.isLocalFallback
        });
        
        // Make sure isLocalFallback is explicitly set to false for stored fusions
        const finalIsLocalFallback = data.isLocalFallback || false;
        setIsLocalFallback(finalIsLocalFallback);
        setFusionName(data.fusionName || generatedFusionName);
        
        // Store the fusion data in localStorage for debugging
        // Make sure we explicitly include isLocalFallback: false for proper fusion types
        try {
          const fusionForStorage = {
            ...data,
            isLocalFallback: finalIsLocalFallback,
            output: data.output || data.fusionImage,
            fusionName: data.fusionName || generatedFusionName
          };
          localStorage.setItem('lastGeneratedFusion', JSON.stringify(fusionForStorage));
          console.log('Fusion data saved to localStorage with isLocalFallback =', finalIsLocalFallback);
        } catch (storageError) {
          console.error('Failed to store fusion data in localStorage:', storageError);
        }
        
        // Track fusion generation success or fallback
        gaEvent({
          action: finalIsLocalFallback ? 'fusion_generation_fallback' : 'fusion_generation_success',
          category: 'engagement',
          label: `${name1}-${name2}`,
          value: undefined
        });
        
        // Show appropriate success message
        if (finalIsLocalFallback) {
          toast.success('Showing simplified fusion.');
        } else {
          toast.success('AI Fusion generated successfully!');
        }
      } catch (fetchError) {
        // Clear the timeout
        clearTimeout(timeoutId)
        
        console.error('Error in fetch:', fetchError);
        toast.dismiss('fusion-generation')
        
        // Track fusion generation error
        gaEvent({
          action: 'fusion_generation_error',
          category: 'error',
          label: `${name1}-${name2}`,
          value: undefined
        });
        
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