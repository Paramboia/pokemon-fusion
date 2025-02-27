"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

export function useLikes() {
  const [updating, setUpdating] = useState(false)
  const { user } = useUser()

  const toggleLike = async (fusionId: string) => {
    if (!user) {
      toast.error('Please sign in to like fusions')
      return
    }

    setUpdating(true)
    try {
      // Get fusion details including creator's user ID
      const { data: fusion } = await supabase
        .from('fusions')
        .select('*')
        .eq('id', fusionId)
        .single()

      if (fusion.user_id !== user.id) {  // Don't notify for self-likes
        // Send notification to fusion creator
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: fusion.user_id,
            title: 'New Like!',
            message: `Someone liked your fusion: ${fusion.fusion_name}`,
            url: `/fusion/${fusionId}`,
          }),
        })
      }

      // First, check if user has already liked this fusion
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('fusion_id', fusionId)
        .single()

      if (existingLike) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('fusion_id', fusionId)

        // Decrement likes count
        await supabase.rpc('decrement_likes', {
          fusion_id: fusionId
        })

        toast.success('Removed like')
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            fusion_id: fusionId
          })

        // Increment likes count
        await supabase.rpc('increment_likes', {
          fusion_id: fusionId
        })

        toast.success('Added like')
      }
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