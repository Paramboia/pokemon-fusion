"use client"

import { useState } from 'react'
import { toast } from 'sonner'

export function useFusion() {
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
      
      // Call the API endpoint to generate the fusion
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pokemon1: image1Url,
          pokemon2: image2Url,
          name1,
          name2,
          pokemon1Id,
          pokemon2Id
        }),
      })
      
      // Parse the response
      const data = await response.json()
      
      // Check if the response is successful
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate fusion'
        console.error('API error:', errorMessage)
        
        // Check if payment is required
        if (response.status === 402 || data.paymentRequired) {
          setIsPaymentRequired(true)
        }
        
        setError(errorMessage)
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      console.log('Fusion generated successfully:', data)
      
      // Check if this is a local fallback
      if (data.isLocalFallback) {
        setIsLocalFallback(true)
        toast.warning('Using local fallback for fusion generation')
      }
      
      // Set the fusion data
      setFusionImage(data.url)
      setFusionId(data.id)
      setFusionName(data.name)
      
      return true
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate fusion'
      console.error('Error generating fusion:', errorMessage)
      setError(errorMessage)
      throw error
    } finally {
      // Always reset the generating state
      setGenerating(false)
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