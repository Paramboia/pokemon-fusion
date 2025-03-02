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

      // Parse the response
      const data = await response.json()

      // Check if the response is successful
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate fusion'
        console.error('Error generating fusion:', errorMessage, 'Status:', response.status)
        
        if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.')
          setError('Authentication required')
        } else if (response.status === 402) {
          setIsPaymentRequired(true)
          setError('Payment required to generate more fusions')
        } else {
          toast.error(errorMessage)
          setError(errorMessage)
        }
        
        setGenerating(false)
        return
      }

      // Set the fusion data
      console.log('Fusion generated successfully:', data)
      setFusionImage(data.fusionImage)
      setFusionId(data.fusionId)
      setFusionName(data.fusionName)
      setIsLocalFallback(data.isLocalFallback || false)
      
      // Show success message
      toast.success('Fusion generated successfully!')
    } catch (err) {
      console.error('Error in generateFusion:', err)
      setError('An unexpected error occurred')
      toast.error('Failed to generate fusion. Please try again.')
    } finally {
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