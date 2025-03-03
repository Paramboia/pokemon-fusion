"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Download, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
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
  const [forceShowOverlay, setForceShowOverlay] = useState(false)
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

  const handleDoubleClick = () => {
    setForceShowOverlay(!forceShowOverlay);
  };

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      <Card className="overflow-hidden">
        {/* Image container */}
        <div className="relative aspect-square">
          <Image
            src={fusion.fusion_image}
            alt={fusion.fusion_name}
            fill
            className="object-contain p-4"
          />
          
          {/* Hover overlay with actions - visible on hover or when forced */}
          {showActions && (
            <div 
              className={`absolute inset-0 bg-black/70 flex items-center justify-center
                ${forceShowOverlay ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
                transition-opacity duration-300`}
            >
              <div className="flex gap-4">
                {/* Like button */}
                <button 
                  onClick={handleLike}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                  aria-label="Like fusion"
                >
                  <Heart className={`h-6 w-6 text-white ${isLiked ? 'fill-red-500' : ''}`} />
                </button>
                
                {/* Download button */}
                <button 
                  onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                  aria-label="Download fusion"
                >
                  <Download className="h-6 w-6 text-white" />
                </button>
                
                {/* Share button */}
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="bg-white/20 hover:bg-white/40 rounded-full p-3 transition-colors"
                  aria-label="Share fusion"
                >
                  <Share2 className="h-6 w-6 text-white" />
                </button>
              </div>
              
              {/* Share options popup */}
              {showShareOptions && (
                <div className="absolute bottom-20 bg-black/90 rounded-lg p-3 flex flex-col gap-2 z-10">
                  <button 
                    onClick={() => handleShare('twitter')}
                    className="text-white hover:text-blue-400 px-4 py-2 text-sm transition-colors"
                  >
                    Twitter
                  </button>
                  <button 
                    onClick={() => handleShare('facebook')}
                    className="text-white hover:text-blue-600 px-4 py-2 text-sm transition-colors"
                  >
                    Facebook
                  </button>
                  <button 
                    onClick={() => handleShare('reddit')}
                    className="text-white hover:text-orange-500 px-4 py-2 text-sm transition-colors"
                  >
                    Reddit
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Mobile-friendly permanent action bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-2 flex justify-center gap-4 md:hidden">
            <button 
              onClick={handleLike}
              className="bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
              aria-label="Like fusion"
            >
              <Heart className={`h-5 w-5 text-white ${isLiked ? 'fill-red-500' : ''}`} />
            </button>
            
            <button 
              onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
              className="bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
              aria-label="Download fusion"
            >
              <Download className="h-5 w-5 text-white" />
            </button>
            
            <button 
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
              aria-label="Share fusion"
            >
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Pokemon name */}
        <div className="p-3 text-center bg-muted">
          <h3 className="font-bold text-lg">{fusion.fusion_name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{likeCount} likes</p>
        </div>
      </Card>
    </div>
  )
} 