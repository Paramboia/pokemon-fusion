"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function useFusion() {
  const router = useRouter()
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

      // Get the Clerk session token - AuthGate ensures the user is already signed in
      const token = await getToken()
      console.log('Got authentication token:', token ? 'Yes' : 'No')
      
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication error. Please refresh and try again.');
        setError('Authentication error');
        setGenerating(false);
        return;
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
        // Create a fusion name by combining parts of both Pokémon names
        const generatedFusionName = `${name1.substring(0, Math.ceil(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
        
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
        clearTimeout(warmupTimer)

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
          } else if (response.status === 404 && errorMessage.includes('User not found')) {
            toast.error('Your account is not properly synced. Please refresh the page and try again.');
            setError('User account not synced with database');
          } else if (response.status === 500 || response.status === 504) {
            // For server errors, use a more user-friendly message and try simple fusion
            toast.error('AI fusion failed. Using simple fusion instead.');
            setError('The AI fusion generator is currently unavailable. Using simple fusion.');
            
            // Try again with simple fusion
            const simpleFusionResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Simple-Fusion': 'true', // Indicate this is a simple fusion
              },
              credentials: 'include',
              body: JSON.stringify({
                pokemon1Id,
                pokemon2Id,
                pokemon1Name: name1,
                pokemon2Name: name2,
                fusionName: generatedFusionName
              })
            });

            if (!simpleFusionResponse.ok) {
              toast.error('Simple fusion also failed. Please try again later.');
              setError('Both fusion methods failed. Please try again later.');
              setGenerating(false);
              return;
            }

            const simpleFusionData = await simpleFusionResponse.json();
            setFusionImage(simpleFusionData.output || simpleFusionData.fusionImage);
            setFusionId(simpleFusionData.id);
            setIsLocalFallback(true);
            setFusionName(simpleFusionData.fusionName || generatedFusionName);
            toast.success('Simple fusion created successfully!');
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
          console.log('Fusion API response:', data);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
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
        setIsLocalFallback(data.isLocalFallback || false);
        setFusionName(data.fusionName || generatedFusionName);
        
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
        toast.dismiss('fusion-generation')
        
        // Check if it was an abort error (timeout)
        if (fetchError.name === 'AbortError') {
          toast.error('The fusion generation is taking longer than expected. Using simple fusion.');
          
          // Try simple fusion as fallback
          try {
            const simpleFusionResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Simple-Fusion': 'true', // Indicate this is a simple fusion
              },
              credentials: 'include',
              body: JSON.stringify({
                pokemon1Id,
                pokemon2Id,
                pokemon1Name: name1,
                pokemon2Name: name2,
                fusionName: generatedFusionName
              })
            });

            if (!simpleFusionResponse.ok) {
              toast.error('Simple fusion also failed. Please try again later.');
              setError('Both fusion methods failed. Please try again later.');
              setGenerating(false);
              return;
            }

            const simpleFusionData = await simpleFusionResponse.json();
            setFusionImage(simpleFusionData.output || simpleFusionData.fusionImage);
            setFusionId(simpleFusionData.id);
            setIsLocalFallback(true);
            setFusionName(simpleFusionData.fusionName || generatedFusionName);
            toast.success('Simple fusion created successfully!');
          } catch (simpleFusionError) {
            console.error('Error in simple fusion:', simpleFusionError);
            toast.error('All fusion methods failed. Please try again later.');
            setError('Failed to generate fusion using any method.');
          }
        } else {
          toast.error('Oops, something went wrong when cooking. Please try again in a few minutes.');
          setError('An unexpected error occurred. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error in generateFusion:', err);
      toast.dismiss('fusion-generation')
      setError('An unexpected error occurred');
      toast.error('Failed to generate fusion. Please try again.');
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