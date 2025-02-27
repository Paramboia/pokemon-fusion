"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { FusionDB } from './use-favorites'

export function useTrending() {
  const [trendingFusions, setTrendingFusions] = useState<FusionDB[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingFusions()
  }, [])

  const fetchTrendingFusions = async () => {
    try {
      const { data, error } = await supabase
        .from('fusions')
        .select('*')
        .order('likes', { ascending: false })
        .limit(6)

      if (error) throw error

      setTrendingFusions(data)
    } catch (error) {
      console.error('Error fetching trending fusions:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    trendingFusions,
    loading,
    refetch: fetchTrendingFusions
  }
} 