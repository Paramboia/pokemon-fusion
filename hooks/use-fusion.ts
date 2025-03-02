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

      console.log('Generating fusion for:', { name1, name2 })

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

      // Call the API endpoint to generate the fusion
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify({
          pokemon1: image1Url,
          pokemon2: image2Url,
          name1,
          name2,
          pokemon1Id,
          pokemon2Id
        }),
      })

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
        
        if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.');
          setError('Authentication required');
        } else if (response.status === 402) {
          setIsPaymentRequired(true);
          setError('Payment required to generate more fusions');
        } else if (response.status === 500) {
          // For server errors, use a more user-friendly message
          toast.error('Server error. Please try again later.');
          setError('The fusion generator is currently experiencing issues. Please try again later.');
          
          // Use a fallback approach for 500 errors
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
          toast.error(errorMessage);
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
        toast.error('Invalid response from server');
        setError('Failed to parse server response');
        setGenerating(false);
        return;
      }

      // Set the fusion data
      console.log('Fusion generated successfully:', data);
      setFusionImage(data.fusionImage);
      setFusionId(data.fusionId);
      setFusionName(data.fusionName);
      setIsLocalFallback(data.isLocalFallback || false);
      
      // Show success message
      toast.success('Fusion generated successfully!');
    } catch (err) {
      console.error('Error in generateFusion:', err);
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