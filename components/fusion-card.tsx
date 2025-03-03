"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Share2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser } from "@clerk/nextjs";
import { toast } from 'sonner'

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
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(fusion.likes)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser();
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  // Add state to force hover visibility for testing
  const [forceShowActions, setForceShowActions] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const userId = user?.id;
      if (userId) {
        try {
          setIsLoading(true);
          // Fetch favorites from the API
          const response = await fetch(`/api/favorites?userId=${userId}`);
          
          if (response.ok) {
            const data = await response.json();
            const favorites = data.favorites || [];
            // Check if this fusion is in the favorites
            const isFav = favorites.some((fav: any) => fav.id === fusion.id);
            setIsFavorite(isFav);
          } else {
            console.error('Error fetching favorites');
          }
        } catch (error) {
          console.error('Error checking favorite status:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkFavoriteStatus();
  }, [fusion.id, user?.id]);

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
        onLike?.(fusion.id);
        toast.success('Liked fusion!');
      }
    } catch (error) {
      console.error('Error liking fusion:', error);
      toast.error('Failed to like fusion');
    }
  };

  const handleFavorite = async () => {
    try {
      setIsLoading(true);
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Please sign in to favorite fusions');
        setIsLoading(false);
        return;
      }
      
      if (isFavorite) {
        // Use the API endpoint to remove favorite
        const response = await fetch('/api/favorites/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            fusionId: fusion.id
          }),
        });
        
        if (response.ok) {
          setIsFavorite(false);
          toast.success('Removed from favorites');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error removing favorite:', errorData);
          toast.error('Failed to remove from favorites');
        }
      } else {
        // Use the API endpoint to add favorite
        const response = await fetch('/api/favorites/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            fusionId: fusion.id
          }),
        });
        
        if (response.ok) {
          setIsFavorite(true);
          toast.success('Added to favorites');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error adding favorite:', errorData);
          toast.error('Failed to add to favorites');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle force show actions (for testing)
  const toggleForceShowActions = () => {
    setForceShowActions(!forceShowActions);
  };

  return (
    <div className="h-full">
      <Card 
        className="relative group overflow-hidden h-full flex flex-col"
        onDoubleClick={toggleForceShowActions}
      >
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
        
        <div className="p-4 text-center bg-muted">
          <h3 className="font-bold text-lg">{fusion.fusion_name}</h3>
        </div>
        
        {/* Fixed action buttons that are always visible for mobile */}
        <div className="md:hidden flex justify-center gap-2 p-2 bg-muted border-t">
          <Button
            variant="outline"
            size="icon"
            onClick={handleFavorite}
            className="h-8 w-8"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
            className="h-8 w-8"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShare(!showShare)}
            className="h-8 w-8"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {onDelete && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(fusion.id)}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {showActions && (
          <div 
            className={`absolute inset-0 bg-black/70 hidden md:flex flex-col justify-center items-center
              ${forceShowActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
              transition-opacity duration-200`}
          >
            <div className="flex justify-center gap-4 mb-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleFavorite}
                className="bg-white/20 hover:bg-white/40 text-white"
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => downloadImage(fusion.fusion_image, fusion.fusion_name)}
                className="bg-white/20 hover:bg-white/40 text-white"
              >
                <Download className="h-6 w-6" />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setShowShare(!showShare)}
                className="bg-white/20 hover:bg-white/40 text-white"
              >
                <Share2 className="h-6 w-6" />
              </Button>

              {onDelete && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onDelete(fusion.id)}
                  className="bg-white/20 hover:bg-white/40 text-white"
                >
                  <Trash2 className="h-6 w-6" />
                </Button>
              )}
            </div>

            {showShare && (
              <div className="flex justify-center gap-2 bg-black/80 p-3 rounded-lg">
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
            
            <h3 className="font-bold text-xl text-white mt-4">{fusion.fusion_name}</h3>
          </div>
        )}
        
      </Card>
    </div>
  )
} 