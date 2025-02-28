"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Download, Share2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadImage } from '@/lib/utils'

// Define the FusionDB interface here
interface FusionDB {
  id: string;
  user_id: string;
  pokemon_1_id: number;
  pokemon_2_id: number;
  fusion_name: string;
  fusion_image: string;
  likes: number;
  created_at: string;
}

// Simple share button component
const ShareButton = ({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode; 
  onClick?: () => void 
}) => (
  <Button 
    variant="ghost" 
    size="sm" 
    className="text-white hover:bg-white/20"
    onClick={onClick}
  >
    {children}
  </Button>
);

interface FusionCardProps {
  fusion: FusionDB
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
}

export function FusionCard({ fusion, onDelete, onLike, showActions = true }: FusionCardProps) {
  const [showShare, setShowShare] = useState(false)
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  const handleShare = (platform: string) => {
    // Simple share implementation
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
    }
  };

  return (
    <div className="h-full">
      <Card className="relative group overflow-hidden h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full h-64 relative">
            <Image
              src={fusion.fusion_image}
              alt={fusion.fusion_name}
              fill
              className="object-contain"
            />
          </div>
        </div>
        
        {showActions && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onLike?.(fusion.id)}
                className="text-white hover:bg-white/20"
              >
                <Heart className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShare(!showShare)}
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(fusion.id)}
                  className="text-white hover:bg-white/20"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>

            {showShare && (
              <div className="absolute top-4 left-4 right-4 flex justify-center gap-2 bg-black/80 p-2 rounded-lg">
                <ShareButton onClick={() => handleShare('twitter')}>
                  Twitter
                </ShareButton>
                
                <ShareButton onClick={() => handleShare('facebook')}>
                  Facebook
                </ShareButton>
                
                <ShareButton onClick={() => handleShare('reddit')}>
                  Reddit
                </ShareButton>
              </div>
            )}
          </div>
        )}
        
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">{fusion.fusion_name}</h3>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(fusion.created_at).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">{fusion.likes}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
} 