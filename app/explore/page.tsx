"use client"

import { useState } from 'react'
import { SearchBar, FusionGrid, TrendingSection } from '@/components'
import { useLikes } from '@/hooks/use-likes'
import { toast } from 'sonner'

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { toggleLike } = useLikes()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleLike = async (fusionId: string) => {
    try {
      await toggleLike(fusionId)
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Explore Fusions</h1>
      
      <div className="max-w-2xl mx-auto mb-8">
        <SearchBar onSearch={handleSearch} />
      </div>

      <TrendingSection />

      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-6">All Fusions</h2>
        <FusionGrid onLike={handleLike} />
      </div>
    </div>
  )
} 