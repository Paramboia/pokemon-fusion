"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser } from "@clerk/nextjs";
import { toast } from 'sonner'

interface FusionCardProps {
  fusion: FusionDB
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
}

export function FusionCard({ fusion, onDelete, onLike, showActions = true }: FusionCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(fusion.likes)
  const { user } = useUser();
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  const handleLike = async () => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Please sign in to like fusions');
        return;
      }
      
      const success = await dbService.likeFusion(fusion.id);
      
      if (success) {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        onLike?.(fusion.id);
        toast.success('Liked fusion!');
      }
    } catch (error) {
      console.error('Error liking fusion:', error);
      toast.error('Failed to like fusion');
    }
  };

  const handleShare = (platform: string) => {
    const text = `Check out this Pokemon fusion: ${fusion.fusion_name}`;
    let url = '';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'reddit':
        url = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
      setShowShareOptions(false);
    }
  };

  return (
    <div className="relative group">
      <Card className="overflow-hidden">
        {/* Image container */}
        <div className="relative aspect-square">
          <Image
            src={fusion.fusion_image}
            alt={fusion.fusion_name}
            fill
            className="object-contain p-4"
          />
          
          {/* Hover overlay with actions */}
          {showActions && (
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
              <div className="flex gap-4">
                {/* Like button */}
                <button 
                  onClick={handleLike}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                >
                  <Heart className={`h-6 w-6 text-white ${isLiked ? 'fill-red-500' : ''}`} />
                </button>
                
                {/* Download button */}
                <button 
                  onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                >
                  <Download className="h-6 w-6 text-white" />
                </button>
                
                {/* Share button */}
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                >
                  <Share2 className="h-6 w-6 text-white" />
                </button>
              </div>
              
              {/* Share options popup */}
              {showShareOptions && (
                <div className="absolute bottom-20 bg-black/90 rounded-lg p-3 flex flex-col gap-2">
                  <button 
                    onClick={() => handleShare('twitter')}
                    className="text-white hover:text-blue-400 px-4 py-2 text-sm"
                  >
                    Twitter
                  </button>
                  <button 
                    onClick={() => handleShare('facebook')}
                    className="text-white hover:text-blue-600 px-4 py-2 text-sm"
                  >
                    Facebook
                  </button>
                  <button 
                    onClick={() => handleShare('reddit')}
                    className="text-white hover:text-orange-500 px-4 py-2 text-sm"
                  >
                    Reddit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Pokemon name */}
        <div className="p-3 text-center bg-muted">
          <h3 className="font-bold text-lg">{fusion.fusion_name}</h3>
        </div>
      </Card>
    </div>
  )
} 