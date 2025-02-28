"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
// import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

export function useLikes() {
  const [updating, setUpdating] = useState(false)
  // const { user } = useUser()

  const toggleLike = async (fusionId: string) => {
    // Simplified version without Clerk authentication
    setUpdating(true)
    
    try {
      // Mock function that just shows a toast
      toast.success('Like toggled successfully')
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      toast.error('Failed to update like')
      console.error(error)
    } finally {
      setUpdating(false)
    }
  }

  return {
    toggleLike,
    updating
  }
} 