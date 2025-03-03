"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Share } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser } from "@clerk/nextjs";
import { toast } from 'sonner'
import styles from './fusion-card.module.css'

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
  const [isMobile, setIsMobile] = useState(false)
  const { user } = useUser();
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
    <div className={styles.cardContainer}>
      <Card className="overflow-hidden">
        {/* Image container */}
        <div className={styles.imageContainer}>
          <Image
            src={fusion.fusion_image}
            alt={fusion.fusion_name}
            fill
            className="object-contain p-4"
          />
          
          {/* Desktop hover overlay */}
          {showActions && !isMobile && (
            <div className={styles.hoverOverlay}>
              <div className="flex gap-4">
                {/* Like button */}
                <button 
                  onClick={handleLike}
                  className={styles.actionButton}
                  aria-label="Like fusion"
                >
                  <Heart className={`${styles.actionIcon} ${isLiked ? 'fill-red-500' : ''}`} />
                </button>
                
                {/* Download button */}
                <button 
                  onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                  className={styles.actionButton}
                  aria-label="Download fusion"
                >
                  <Download className={styles.actionIcon} />
                </button>
                
                {/* Share button */}
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className={styles.actionButton}
                  aria-label="Share fusion"
                >
                  <Share className={styles.actionIcon} />
                </button>
              </div>
            </div>
          )}
          
          {/* Mobile permanent action bar */}
          {showActions && isMobile && (
            <div className={styles.mobileActionBar}>
              <div className="flex gap-4">
                {/* Like button */}
                <button 
                  onClick={handleLike}
                  className={styles.actionButton}
                  aria-label="Like fusion"
                >
                  <Heart className={`${styles.actionIcon} ${isLiked ? 'fill-red-500' : ''}`} />
                </button>
                
                {/* Download button */}
                <button 
                  onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                  className={styles.actionButton}
                  aria-label="Download fusion"
                >
                  <Download className={styles.actionIcon} />
                </button>
                
                {/* Share button */}
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className={styles.actionButton}
                  aria-label="Share fusion"
                >
                  <Share className={styles.actionIcon} />
                </button>
              </div>
            </div>
          )}
          
          {/* Share options popup */}
          {showShareOptions && (
            <div className={styles.shareOptions}>
              <button 
                onClick={() => handleShare('twitter')}
                className={`${styles.shareButton} ${styles.twitterButton}`}
              >
                Twitter
              </button>
              <button 
                onClick={() => handleShare('facebook')}
                className={`${styles.shareButton} ${styles.facebookButton}`}
              >
                Facebook
              </button>
              <button 
                onClick={() => handleShare('reddit')}
                className={`${styles.shareButton} ${styles.redditButton}`}
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