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
    console.log('CLICK DETECTED - handleLike function called');
    try {
      const userId = user?.id;
      
      console.log('FusionCard - handleLike called for fusion:', fusion.id);
      console.log('FusionCard - User ID:', userId);
      
      if (!userId) {
        toast.error('Please sign in to like fusions');
        return;
      }
      
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
      }
    } catch (error) {
      console.error('FusionCard - Error liking fusion:', error);
      toast.error('Failed to like fusion');
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

  // Determine background color based on theme
  const isDarkTheme = mounted && theme === 'dark'
  const backgroundColor = isDarkTheme ? '#1f2937' : '#ffffff' // dark gray for dark mode, white for light mode

  return (
    <div 
      style={{ position: 'relative' }}
      onClick={() => console.log('Outer div clicked')}
    >
      <Card 
        className="overflow-hidden" 
        style={{ backgroundColor }}
        onClick={() => console.log('Card clicked')}
      >
        {/* Image container */}
        <div 
          style={{
            position: 'relative',
            aspectRatio: '1/1',
            backgroundColor: isDarkTheme ? '#111827' : '#f9fafb' // Even darker for image background in dark mode
          }}
          onClick={() => console.log('Image container clicked')}
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
              onClick={(e) => {
                e.stopPropagation(); // Stop event propagation
                console.log('Like button clicked directly');
                handleLike();
              }}
              style={{ 
                backgroundColor: 'rgba(255, 0, 0, 0.4)', // Make it red to stand out
                borderRadius: '9999px',
                padding: '0.75rem', // Make it bigger
                border: '2px solid white', // Add a border
                cursor: 'pointer',
                zIndex: 100 // Ensure it's on top
              }}
              aria-label="Like fusion"
            >
              <Heart 
                style={{ 
                  width: '1.5rem', // Make it bigger
                  height: '1.5rem', // Make it bigger
                  color: 'white',
                  fill: isLiked ? '#ef4444' : 'none'
                }}
              />
            </button>
            
            {/* Download button */}
            <button 
              onClick={() => downloadImage(getFusionImage(), getFusionName())}
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
        
        {/* Fusion details */}
        <div className="p-4">
          <h3 className="text-lg font-bold mb-1">{getFusionName()}</h3>
          
          {/* Display Pokémon names if available */}
          {(getPokemon1Name() || getPokemon2Name()) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              A fusion of {getPokemon1Name() || 'Unknown'} and {getPokemon2Name() || 'Unknown'}
            </p>
          )}
          
          {/* Like count */}
          <div className="flex items-center mt-2">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{likeCount || 0} likes</span>
          </div>
        </div>
      </Card>
    </div>
  );
} 