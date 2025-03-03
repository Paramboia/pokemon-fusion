"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Share } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser } from "@clerk/nextjs";
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

interface FusionCardProps {
  fusion: FusionDB
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
}

export default function FusionCard({ fusion, onDelete, onLike, showActions = true }: FusionCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(fusion.likes)
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()
  const { user } = useUser();
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Determine background color based on theme
  const isDarkTheme = mounted && theme === 'dark'
  const backgroundColor = isDarkTheme ? '#1f2937' : '#ffffff' // dark gray for dark mode, white for light mode

  return (
    <div style={{ position: 'relative' }}>
      <Card className="overflow-hidden" style={{ backgroundColor }}>
        {/* Image container */}
        <div style={{ 
          position: 'relative', 
          aspectRatio: '1/1',
          backgroundColor: isDarkTheme ? '#111827' : '#f9fafb' // Even darker for image background in dark mode
        }}>
          <Image
            src={fusion.fusion_image}
            alt={fusion.fusion_name}
            fill
            className="object-contain p-4"
          />
          
          {/* Action buttons - always visible at the bottom */}
          <div 
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '0.5rem 0',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem'
            }}
          >
            {/* Like button */}
            <button 
              onClick={handleLike}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '9999px',
                padding: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Like fusion"
            >
              <Heart 
                style={{ 
                  width: '1.25rem', 
                  height: '1.25rem', 
                  color: 'white',
                  fill: isLiked ? '#ef4444' : 'none'
                }} 
              />
            </button>
            
            {/* Download button */}
            <button 
              onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '9999px',
                padding: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Download fusion"
            >
              <Download 
                style={{ 
                  width: '1.25rem', 
                  height: '1.25rem', 
                  color: 'white' 
                }} 
              />
            </button>
            
            {/* Share button */}
            <button 
              onClick={() => setShowShareOptions(!showShareOptions)}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '9999px',
                padding: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Share fusion"
            >
              <Share 
                style={{ 
                  width: '1.25rem', 
                  height: '1.25rem', 
                  color: 'white' 
                }} 
              />
            </button>
          </div>
          
          {/* Share options popup */}
          {showShareOptions && (
            <div 
              style={{
                position: 'absolute',
                bottom: '4rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                zIndex: 10
              }}
            >
              <button 
                onClick={() => handleShare('twitter')}
                style={{
                  color: 'white',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                Twitter
              </button>
              <button 
                onClick={() => handleShare('facebook')}
                style={{
                  color: 'white',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                Facebook
              </button>
              <button 
                onClick={() => handleShare('reddit')}
                style={{
                  color: 'white',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                Reddit
              </button>
            </div>
          )}
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