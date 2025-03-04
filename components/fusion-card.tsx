"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Send } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser } from "@clerk/nextjs";
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Fusion } from '@/types'

// Create a union type that can be either Fusion or FusionDB
type FusionCardData = Fusion | FusionDB;

interface FusionCardProps {
  fusion: FusionCardData
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
}

export default function FusionCard({ fusion, onDelete, onLike, showActions = true }: FusionCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(fusion.likes || 0)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { theme } = useTheme()
  const { user } = useUser();
  const shareUrl = `${window.location.origin}/fusion/${fusion.id}`

  // Helper function to get properties regardless of type
  const getFusionName = () => {
    return 'fusionName' in fusion ? fusion.fusionName : fusion.fusion_name;
  }

  const getFusionImage = () => {
    const imageUrl = 'fusionImage' in fusion ? fusion.fusionImage : fusion.fusion_image;
    console.log('FusionCard - Image URL:', imageUrl);
    
    // Check if the URL is valid
    if (!imageUrl || imageUrl === '' || imageUrl === 'null' || imageUrl === 'undefined') {
      console.error('Invalid image URL:', imageUrl);
      return '/placeholder-pokemon.svg'; // Fallback SVG image
    }
    
    return imageUrl;
  }

  const getPokemon1Name = () => {
    return 'pokemon1Name' in fusion ? fusion.pokemon1Name : fusion.pokemon_1_name;
  }

  const getPokemon2Name = () => {
    return 'pokemon2Name' in fusion ? fusion.pokemon2Name : fusion.pokemon_2_name;
  }

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

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if the user has already liked this fusion
  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        if (!user?.id || !fusion.id) return;
        
        console.log('FusionCard - Checking if fusion is already liked by user:', user.id);
        const isAlreadyLiked = await dbService.isFavorite(user.id, fusion.id);
        
        console.log('FusionCard - Is fusion already liked:', isAlreadyLiked);
        setIsLiked(isAlreadyLiked);
      } catch (error) {
        console.error('FusionCard - Error checking if fusion is liked:', error);
      }
    };
    
    if (user) {
      checkIfLiked();
    }
  }, [user, fusion.id]);

  const handleLike = async () => {
    try {
      const userId = user?.id;
      
      console.log('FusionCard - handleLike called for fusion:', fusion.id);
      console.log('FusionCard - User ID:', userId);
      
      if (!userId) {
        toast.error('Please sign in to like fusions');
        return;
      }
      
      if (isLiked) {
        // If already liked, unlike the fusion
        console.log('FusionCard - Calling dbService.unlikeFusion with fusion ID:', fusion.id, 'and user ID:', userId);
        const success = await dbService.unlikeFusion(fusion.id, userId);
        
        if (success) {
          console.log('FusionCard - Unlike successful, updating UI');
          setLikeCount(prev => Math.max(0, prev - 1)); // Ensure count doesn't go below 0
          setIsLiked(false);
          onLike?.(fusion.id);
          toast.success('Removed like from fusion');
        } else {
          console.error('FusionCard - Unlike failed, success was false');
          toast.error('Failed to remove like');
        }
      } else {
        // If not liked, like the fusion
        console.log('FusionCard - Calling dbService.likeFusion with fusion ID:', fusion.id, 'and user ID:', userId);
        const success = await dbService.likeFusion(fusion.id, userId);
        
        if (success) {
          console.log('FusionCard - Like successful, updating UI');
          setLikeCount(prev => prev + 1);
          setIsLiked(true);
          onLike?.(fusion.id);
          toast.success('Liked fusion!');
        } else {
          console.error('FusionCard - Like failed, success was false');
          toast.error('Failed to like fusion');
        }
      }
    } catch (error) {
      console.error('FusionCard - Error toggling like:', error);
      toast.error('Failed to update like status');
    }
  };

  const handleShare = (platform: string) => {
    const text = `Check out this Pokemon fusion: ${getFusionName()}`;
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

  // Handle mobile share
  const handleMobileShare = async () => {
    const shareText = `Check out this Pokemon fusion ${getFusionName()} on Pokemon Fusion!`;
    const shareUrl = window.location.origin;
    
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        // Try to share with image if possible
        const response = await fetch(getFusionImage());
        const blob = await response.blob();
        const file = new File([blob], `${getFusionName()}.png`, { type: blob.type });
        
        await navigator.share({
          title: 'Pokémon Fusion',
          text: shareText,
          url: shareUrl,
          files: [file]
        }).catch(error => {
          // If sharing with file fails, try without file
          if (error.name !== 'AbortError') {
            return navigator.share({
              title: 'Pokémon Fusion',
              text: shareText,
              url: shareUrl
            });
          }
          throw error;
        });
        
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
        toast.success('Share link copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy link');
      });
    }
  };

  // Determine background color based on theme
  const isDarkTheme = mounted && theme === 'dark'
  const backgroundColor = isDarkTheme ? '#1f2937' : '#ffffff' // dark gray for dark mode, white for light mode

  return (
    <div 
      className="h-full"
      style={{ position: 'relative' }}
    >
      <Card 
        className="overflow-hidden h-full flex flex-col shadow-md border border-gray-200 dark:border-gray-800 rounded-lg" 
        style={{ backgroundColor }}
      >
        {/* Image container */}
        <div 
          className={`relative aspect-square ${!isMobile ? 'group' : ''}`}
          style={{
            backgroundColor: isDarkTheme ? '#111827' : '#f9fafb',
            flexGrow: 0,
            flexShrink: 0,
            overflow: 'hidden'
          }}
        >
          {/* Add a fallback div in case the image fails to load */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDarkTheme ? '#111827' : '#f9fafb',
              zIndex: 1
            }}
          >
            <p className="text-gray-500">Loading fusion...</p>
          </div>
          
          <Image
            src={getFusionImage()}
            alt={getFusionName()}
            fill
            className="object-contain p-4"
            style={{ zIndex: 2 }}
            onError={(e) => {
              console.error('Image failed to load:', getFusionImage());
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              // Hide the fallback div when the image loads successfully
              e.currentTarget.style.zIndex = '3';
            }}
          />
          
          {/* Desktop overlay - only visible on hover */}
          {!isMobile && showActions && (
            <div
              className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
              style={{ zIndex: 4 }}
            >
              <div className="flex gap-3">
                {/* Download button */}
                <button 
                  onClick={() => downloadImage(getFusionImage(), getFusionName())}
                  className="bg-gray-700/80 hover:bg-gray-800 rounded-full p-3 transition-colors flex items-center justify-center shadow-lg"
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Download fusion"
                >
                  <Download className="h-5 w-5 text-white" />
                </button>
                
                {/* Like button - Same background as other buttons, only heart changes */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className="bg-gray-700/80 hover:bg-gray-800 rounded-full p-3 transition-colors flex items-center justify-center shadow-lg"
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Like fusion"
                >
                  <Heart className={`h-5 w-5 text-white ${isLiked ? 'fill-red-400' : ''}`} />
                </button>
                
                {/* Share button (now using Send icon) */}
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="bg-gray-700/80 hover:bg-gray-800 rounded-full p-3 transition-colors flex items-center justify-center shadow-lg"
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Share fusion"
                >
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          )}
          
          {/* Share options popup */}
          {showShareOptions && !isMobile && (
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
                zIndex: 20
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
        
        {/* Fusion details */}
        <div className="p-4 flex-grow flex flex-col">
          <h3 className="text-lg font-bold mb-1 capitalize text-gray-800 dark:text-white">{getFusionName()}</h3>
          
          {/* Display Pokémon names if available */}
          {(getPokemon1Name() || getPokemon2Name()) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              A fusion of <span className="capitalize">{getPokemon1Name() || 'Unknown'}</span> and <span className="capitalize">{getPokemon2Name() || 'Unknown'}</span>
            </p>
          )}
          
          {/* Like count */}
          <div className="flex items-center mt-auto pt-2">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{likeCount || 0} likes</span>
          </div>
          
          {/* Mobile action buttons - displayed as full CTAs below the details */}
          {isMobile && showActions && (
            <div className="flex mt-4 gap-2">
              <Button variant="outline" onClick={() => downloadImage(getFusionImage(), getFusionName())}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              {/* Always use outline variant, change text color and fill heart when liked */}
              <Button
                variant="outline"
                onClick={handleLike}
                className={isLiked ? "text-red-600 border-red-600 hover:bg-red-50 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-950/10" : ""}
              >
                <Heart className={`mr-2 h-4 w-4 ${isLiked ? "fill-red-600 text-red-600 dark:fill-red-500 dark:text-red-500" : ""}`} />
                {isLiked ? "Liked" : "Like"}
              </Button>
              
              <Button variant="outline" onClick={handleMobileShare}>
                <Send className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 