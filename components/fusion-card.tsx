"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Download, Send, Trophy } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { downloadImage } from '@/lib/utils'
import { dbService, FusionDB } from '@/lib/supabase-client'
import { useUser, useAuth } from "@clerk/nextjs";
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Fusion } from '@/types'
import { cn } from '@/lib/utils'

// Create a union type that can be either Fusion or FusionDB
type FusionCardData = Fusion | FusionDB;

interface FusionCardProps {
  fusion: FusionCardData
  onDelete?: (id: string) => void
  onLike?: (id: string) => void
  showActions?: boolean
  showFallbackWarning?: boolean
  rank?: 1 | 2 | 3 // Add rank prop for top fusions in Popular page
}

export default function FusionCard({ fusion, onDelete, onLike, showActions = true, showFallbackWarning = true, rank }: FusionCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(fusion.likes || 0)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { theme } = useTheme()
  const { user } = useUser();
  const { getToken } = useAuth();
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

  // Get rank-based styling
  const getRankBorderStyle = () => {
    if (!rank) return {};
    
    switch (rank) {
      case 1:
        return { borderColor: '#FFD700', borderWidth: '3px' }; // Gold
      case 2:
        return { borderColor: '#C0C0C0', borderWidth: '3px' }; // Silver
      case 3:
        return { borderColor: '#CD7F32', borderWidth: '3px' }; // Bronze
      default:
        return {};
    }
  };

  // Get rank trophy color
  const getRankTrophyColor = () => {
    if (!rank) return '';
    
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return '';
    }
  };

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
        // Skip API call for temporary fusions
        if (fusion.id === 'temp-fusion') {
          console.log('FusionCard - Skipping like check for temporary fusion');
          return;
        }
        
        if (!user) {
          console.log('FusionCard - No user, skipping like check');
          return;
        }

        console.log('FusionCard - Checking if fusion is liked:', fusion.id);
        const token = await getToken();
         
        if (!token) {
          console.error('FusionCard - No authentication token available for like check');
          return;
        }
        
        // Use fetch with credentials included
        const response = await fetch(`/api/favorites/check?fusionId=${fusion.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include' // Include cookies for session-based auth
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('FusionCard - Error checking if fusion is liked:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          return;
        }
        
        const data = await response.json();
        console.log('FusionCard - Like check result:', data);
        
        if (data.isLiked) {
          setIsLiked(true);
        }
      } catch (error) {
        console.error('FusionCard - Error in checkIfLiked:', error);
      }
    };
    
    if (user) {
      checkIfLiked();
    }
  }, [user, fusion.id, getToken]);

  const handleLike = async () => {
    try {
      // Skip API call for temporary fusions
      if (fusion.id === 'temp-fusion') {
        console.log('FusionCard - Skipping API call for temporary fusion');
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        toast.success(isLiked ? 'Removed like from fusion' : 'Liked fusion!');
        
        // Call the onLike callback if provided
        if (onLike) {
          onLike(fusion.id);
        }
        return;
      }
      
      if (!user) {
        toast.error('Please sign in to like fusions');
        return;
      }

      const token = await getToken();
      if (!token) {
        console.error('FusionCard - No authentication token available');
        toast.error('Authentication error. Please sign in again.');
        return;
      }
      
      if (isLiked) {
        // Unlike the fusion
        console.log('FusionCard - Unliking fusion:', fusion.id);
        const response = await fetch(`/api/favorites?fusionId=${fusion.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include' // Include cookies for session-based auth
        });
        
        if (!response.ok) {
          let errorMessage = 'Failed to unlike fusion';
          let errorData: Record<string, any> = {};
          
          try {
            errorData = await response.json();
            if (errorData && typeof errorData === 'object' && 'error' in errorData) {
              errorMessage = errorData.error as string;
            }
          } catch (e) {
            console.error('FusionCard - Error parsing error response:', e);
          }
          
          console.error('FusionCard - Error unliking fusion:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          
          if (response.status === 401 || response.status === 403) {
            toast.error('Authentication error. Please sign in again.');
          } else {
            toast.error(errorMessage);
          }
          return;
        }
        
        setIsLiked(false);
        setLikeCount(likeCount - 1);
        toast.success('Removed like from fusion');
      } else {
        // Like the fusion
        console.log('FusionCard - Liking fusion:', fusion.id);
        const response = await fetch(`/api/favorites?fusionId=${fusion.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fusionId: fusion.id }),
          credentials: 'include' // Include cookies for session-based auth
        });
        
        if (!response.ok) {
          let errorMessage = 'Failed to like fusion';
          let errorData: Record<string, any> = {};
          
          try {
            errorData = await response.json();
            if (errorData && typeof errorData === 'object' && 'error' in errorData) {
              errorMessage = errorData.error as string;
            }
          } catch (e) {
            console.error('FusionCard - Error parsing error response:', e);
          }
          
          console.error('FusionCard - Error liking fusion:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          
          if (response.status === 401 || response.status === 403) {
            toast.error('Authentication error. Please sign in again.');
          } else {
            toast.error(errorMessage);
          }
          return;
        }
        
        setIsLiked(true);
        setLikeCount(likeCount + 1);
        toast.success('Liked fusion!');
      }
      
      // Call the onLike callback if provided
      if (onLike) {
        onLike(fusion.id);
      }
    } catch (error) {
      console.error('FusionCard - Error in handleLike:', error);
      toast.error('An error occurred while processing your request');
    }
  };

  const handleShare = async () => {
    const shareText = `Check out this new Pokemon fusion ${getFusionName()}, created with www.pokemon-fusion.com ⭐`;
    
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        // Try to get the image through our proxy endpoint
        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: getFusionImage() }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch image for sharing');
        }

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
          // Try sharing without the image if there was an error
          try {
            await navigator.share({
              title: 'Pokémon Fusion',
              text: shareText,
              url: shareUrl
            });
            toast.success('Shared successfully!');
          } catch (fallbackError) {
            if (fallbackError.name !== 'AbortError') {
              console.error('Error sharing without image:', fallbackError);
              toast.error('Failed to share');
            }
          }
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

  // Check if the fusion is using a local fallback
  // IMPORTANT: Override isLocalFallback to false for fusions in Supabase storage
  let isLocalFallback = 'isLocalFallback' in fusion ? fusion.isLocalFallback : false;
  
  // Get the fusion image URL
  const fusionImageUrl = 'fusionImage' in fusion ? fusion.fusionImage : fusion.fusion_image;

  // If the fusion image URL contains Supabase storage URL, it's not a local fallback
  // Also force override to false for any images in our storage, since they are AI generated
  if (typeof fusionImageUrl === 'string') {
    if (
      // Check for Supabase storage URLs
      fusionImageUrl.includes('supabase') || 
      // Also check for our domain and storage path
      fusionImageUrl.includes('pokemon-fusion.com') ||
      // Any fusion stored in storage (not official artwork or placeholders)
      (fusionImageUrl.includes('storage') && !fusionImageUrl.includes('official-artwork'))
    ) {
      // This is an AI-generated fusion stored in our system, force override isLocalFallback
      console.log('Forcing isLocalFallback to FALSE for AI-generated fusion:', 
        fusionImageUrl.substring(0, 50) + '...');
      isLocalFallback = false;
    }
  }
  
  // Debug: Log the value of isLocalFallback and the fusion object
  console.log(`DEBUG FusionCard [${fusion.id}]:`, {
    originalIsLocalFallback: 'isLocalFallback' in fusion ? fusion.isLocalFallback : false,
    finalIsLocalFallback: isLocalFallback,
    fusionImageUrl: typeof fusionImageUrl === 'string' ? fusionImageUrl.substring(0, 50) + '...' : 'not a string',
    isInSupabase: typeof fusionImageUrl === 'string' && fusionImageUrl.includes('supabase'),
    isOfficialArtwork: typeof fusionImageUrl === 'string' && fusionImageUrl.includes('official-artwork')
  });

  return (
    <div 
      className="h-full"
      style={{ position: 'relative' }}
    >
      {/* Rank trophy badge */}
      {rank && (
        <div 
          className="absolute -top-2 -left-2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
          style={{ 
            backgroundColor: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
            border: '2px solid white'
          }}
        >
          {rank === 1 ? (
            <span className="text-lg font-bold" role="img" aria-label="First place">🥇</span>
          ) : rank === 2 ? (
            <span className="text-lg font-bold" role="img" aria-label="Second place">🥈</span>
          ) : (
            <span className="text-lg font-bold" role="img" aria-label="Third place">🥉</span>
          )}
        </div>
      )}
      
      <Card 
        className={cn(
          "overflow-hidden h-full flex flex-col shadow-md border border-gray-200 dark:border-gray-800 rounded-lg",
          rank === 1 && "shadow-gold",
          rank === 2 && "shadow-silver",
          rank === 3 && "shadow-bronze"
        )}
        style={{ 
          backgroundColor,
          ...getRankBorderStyle()
        }}
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
          {!isMobile && (
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
                
                {/* Like button */}
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
                
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="bg-gray-700/80 hover:bg-gray-800 rounded-full p-3 transition-colors flex items-center justify-center shadow-lg"
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Share fusion"
                >
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Fusion details */}
        <div className="p-4 flex-grow flex flex-col">
          {/* Display fallback warning if using local fallback */}
          {isLocalFallback && showFallbackWarning && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p>Using Simple Fusion</p>
              </div>
              <p className="mt-1 text-xs pl-6">The AI fusion service is temporarily unavailable. We're providing a simplified fusion method for free, which won't consume any credits from your account. Please try generating the fusion again.</p>
            </div>
          )}
          
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
          
          {/* Mobile action buttons */}
          {isMobile && showActions && (
            <div className="flex mt-4 gap-2">
              <Button variant="outline" onClick={() => downloadImage(getFusionImage(), getFusionName())}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              <Button
                variant="outline"
                onClick={handleLike}
                className={isLiked ? "text-red-600 border-red-600 hover:bg-red-50 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-950/10" : ""}
              >
                <Heart className={`mr-2 h-4 w-4 ${isLiked ? "fill-red-600 text-red-600 dark:fill-red-500 dark:text-red-500" : ""}`} />
                {isLiked ? "Liked" : "Like"}
              </Button>
              
              <Button variant="outline" onClick={handleShare}>
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