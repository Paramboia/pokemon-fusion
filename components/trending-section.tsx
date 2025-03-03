"use client"

import { useTrending } from '@/hooks/use-trending'
import FusionCard from './fusion-card'
import { useLikes } from '@/hooks/use-likes'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { dbService, FusionDB } from '@/lib/supabase-client'

export function TrendingSection() {
  const { trendingFusions, loading, refetch } = useTrending()
  const { toggleLike } = useLikes()

  const handleLike = async (fusionId: string) => {
    await toggleLike(fusionId)
    refetch()
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <section className="py-8">
      <h2 className="text-3xl font-bold mb-6">Trending Fusions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trendingFusions.map((fusion) => (
          <FusionCard
            key={fusion.id}
            fusion={fusion}
            onLike={handleLike}
          />
        ))}
      </div>
    </section>
  )
} 