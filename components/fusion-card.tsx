"use client"

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, Download, Share2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadImage } from '@/lib/utils'
import type { FusionDB } from '@/hooks/use-favorites'
import {
  TwitterShareButton,
  FacebookShareButton,
  RedditShareButton,
} from 'react-share'

interface FusionCardProps {
  fusion: FusionDB
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
}

export function FusionCard({ fusion, onDelete, onLike, showActions = true }: FusionCardProps) {
  const [showShare, setShowShare] = useState(false)
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="relative group overflow-hidden">
        <Image
          src={fusion.fusion_image}
          alt={fusion.fusion_name}
          width={400}
          height={400}
          className="rounded-lg"
        />
        
        {showActions && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onLike?.(fusion.id)}
              >
                <Heart className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
              >
                <Download className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShare(!showShare)}
              >
                <Share2 className="h-5 w-5" />
              </Button>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(fusion.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>

            {showShare && (
              <div className="absolute top-4 left-4 right-4 flex justify-center gap-2 bg-black/80 p-2 rounded-lg">
                <TwitterShareButton url={shareUrl} title={`Check out this Pokemon fusion: ${fusion.fusion_name}`}>
                  <Button variant="ghost" size="sm">Twitter</Button>
                </TwitterShareButton>
                
                <FacebookShareButton url={shareUrl} quote={`Check out this Pokemon fusion: ${fusion.fusion_name}`}>
                  <Button variant="ghost" size="sm">Facebook</Button>
                </FacebookShareButton>
                
                <RedditShareButton url={shareUrl} title={`Check out this Pokemon fusion: ${fusion.fusion_name}`}>
                  <Button variant="ghost" size="sm">Reddit</Button>
                </RedditShareButton>
              </div>
            )}
          </div>
        )}
        
        <div className="p-4">
          <h3 className="text-lg font-semibold">{fusion.fusion_name}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(fusion.created_at).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Heart className="h-4 w-4" />
            <span className="text-sm">{fusion.likes}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
} 