"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'

export function useFusion() {
  const { getToken } = useAuth()
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

      console.log('Generating fusion for:', { name1, name2, pokemon1Id, pokemon2Id })

      // Get the Clerk session token
      const token = await getToken()
      console.log('Got authentication token:', token ? 'Yes' : 'No')

      if (!token) {
        console.error('No authentication token available')
        toast.error('Authentication required. Please sign in.')
        setError('Authentication required')
        setGenerating(false)
        return
      }

      // Show a toast to indicate generation has started
      toast.loading('Starting Pokémon fusion generation...', {
        id: 'fusion-generation',
        duration: 60000, // 60 seconds
      })

      // Update toast after 5 seconds to inform about AI model warming up
      const warmupTimer = setTimeout(() => {
        toast.loading('AI model is warming up. This may take up to a minute...', {
          id: 'fusion-generation',
          duration: 55000, // 55 more seconds
        })
      }, 5000)

      // Set a timeout for the API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 50000) // 50 second timeout

      try {
        // Call the API endpoint to generate the fusion
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include', // Include cookies for session-based auth
          body: JSON.stringify({
            pokemon1Id,
            pokemon2Id,
            fusionName: `${name1}-${name2}`
          }),
          signal: controller.signal
        })

        // Clear the timeout
        clearTimeout(timeoutId)
        clearTimeout(warmupTimer)

        // Check if the response is successful before parsing JSON
        if (!response.ok) {
          let errorMessage = 'Failed to generate fusion';
          
          try {
            // Try to parse the error response as JSON
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If JSON parsing fails, use the status text
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          
          console.error('Error generating fusion:', errorMessage, 'Status:', response.status);
          
          // Dismiss the loading toast
          toast.dismiss('fusion-generation')
          
          if (response.status === 401) {
            toast.error('Authentication required. Please sign in again.');
            setError('Authentication required');
          } else if (response.status === 402) {
            setIsPaymentRequired(true);
            toast.error('Payment required to generate more fusions');
            setError('Payment required to generate more fusions');
          } else if (response.status === 500 || response.status === 504) {
            // For server errors, use a more user-friendly message
            toast.error('Oops, something went wrong when cooking. Please try again in a few minutes.');
            setError('The fusion generator is currently experiencing issues. Please try again later.');
            
            // Use a fallback approach for server errors
            setIsLocalFallback(true);
            
            // Create a simple fusion name
            const firstHalf = name1.substring(0, Math.ceil(name1.length / 2));
            const secondHalf = name2.substring(Math.floor(name2.length / 2));
            const fallbackName = firstHalf + secondHalf;
            
            // Use one of the original images as a fallback
            setFusionImage(image1Url);
            setFusionName(fallbackName);
            
            // Log the fallback approach
            console.log('Using fallback fusion approach due to server error');
            setGenerating(false);
            return;
          } else {
            toast.error('Oops, something went wrong when cooking. Please try again in a few minutes.');
            setError(errorMessage);
          }
          
          setGenerating(false);
          return;
        }

        // Parse the response
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          
          // Dismiss the loading toast
          toast.dismiss('fusion-generation')
          
          toast.error('Invalid response from server');
          setError('Failed to parse server response');
          setGenerating(false);
          return;
        }

        // Dismiss the loading toast
        toast.dismiss('fusion-generation')

        // Set the fusion data
        console.log('Fusion generated successfully:', data);
        setFusionImage(data.output || data.fusionImage);
        setFusionId(data.id);
        
        // Create a fusion name if not provided
        if (data.fusionName) {
          setFusionName(data.fusionName);
        } else {
          const firstHalf = name1.substring(0, Math.ceil(name1.length / 2));
          const secondHalf = name2.substring(Math.floor(name2.length / 2));
          const fallbackName = firstHalf + secondHalf;
          setFusionName(fallbackName);
        }
        
        setIsLocalFallback(data.isLocalFallback || false);
        
        // Show appropriate success message
        if (data.isLocalFallback) {
          toast.success('Fusion created using simplified method!');
        } else {
          toast.success('AI Fusion generated successfully!');
        }
      } catch (fetchError) {
        // Clear the timeout
        clearTimeout(timeoutId)
        clearTimeout(warmupTimer)
        
        console.error('Error in fetch:', fetchError);
        
        // Dismiss the loading toast
        toast.dismiss('fusion-generation')
        
        // Check if it was an abort error (timeout)
        if (fetchError.name === 'AbortError') {
          toast.error('The fusion generation is taking longer than expected. Please try again.');
          setError('The fusion generator took too long to respond. Please try again later.');
        } else {
          toast.error('Oops, something went wrong when cooking. Please try again in a few minutes.');
          setError('An unexpected error occurred. Please try again later.');
        }
        
        // Use a fallback approach
        setIsLocalFallback(true);
        
        // Create a simple fusion name
        const firstHalf = name1.substring(0, Math.ceil(name1.length / 2));
        const secondHalf = name2.substring(Math.floor(name2.length / 2));
        const fallbackName = firstHalf + secondHalf;
        setFusionName(fallbackName);
        
        // Use one of the original images as a fallback
        setFusionImage(image1Url);
        
        setGenerating(false);
      }
    } catch (err) {
      console.error('Error in generateFusion:', err);
      
      // Dismiss the loading toast
      toast.dismiss('fusion-generation')
      
      setError('An unexpected error occurred');
      toast.error('Failed to generate fusion. Please try again.');
      
      // Use a fallback approach for unexpected errors
      setIsLocalFallback(true);
      
      // Create a simple fusion name if we have the names
      if (name1 && name2) {
        const firstHalf = name1.substring(0, Math.ceil(name1.length / 2));
        const secondHalf = name2.substring(Math.floor(name2.length / 2));
        const fallbackName = firstHalf + secondHalf;
        setFusionName(fallbackName);
      }
      
      // Use one of the original images as a fallback
      if (image1Url) {
        setFusionImage(image1Url);
      }
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
  }
} 