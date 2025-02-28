"use client"

import { FusionCard } from './fusion-card'
import { useInfiniteFusions } from '@/hooks/use-infinite-fusions'
import { Loader2 } from 'lucide-react'

interface FusionGridProps {
  userId?: string
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
}

export function FusionGrid({ userId, onDelete, onLike }: FusionGridProps) {
  const { fusions, isLoading, error, hasMore, ref } = useInfiniteFusions(userId)

  if (error) {
    return <div className="text-center text-red-500">{error}</div>
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fusions.map((fusion) => (
          <FusionCard
            key={fusion.id}
            fusion={fusion}
            onDelete={onDelete}
            onLike={onLike}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!hasMore && fusions.length > 0 && (
        <p className="text-center text-muted-foreground">
          No more fusions to load
        </p>
      )}

      {!isLoading && fusions.length === 0 && (
        <p className="text-center text-muted-foreground">
          No fusions found
        </p>
      )}
    </div>
  )
} 