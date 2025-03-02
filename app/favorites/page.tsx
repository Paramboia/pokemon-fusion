"use client";

import { SparklesText } from "@/components/ui";
import { Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FusionCard } from "@/components/fusion-card";
import { FavoritesAuthGate } from "@/components/favorites-auth-gate";
import { dbService, FusionDB } from "@/lib/supabase-client";
import { useUser } from "@clerk/nextjs";
import { useAuthContext } from "@/contexts/auth-context";

export default function FavoritesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FusionDB[]>([]);
  const { user, isLoaded } = useUser();
  const { authError } = useAuthContext();

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isLoaded) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const userId = user?.id;
        
        if (!userId) {
          console.log('User not authenticated, skipping favorites fetch');
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching favorites for user:', userId);
        
        // Call the API endpoint to get favorites
        const response = await fetch(`/api/favorites?userId=${userId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error fetching favorites:', errorData);
          setError('Failed to load favorites. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Fetched favorites:', data.favorites);
        setFavorites(data.favorites || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setError('Failed to load favorites. Please try again later.');
        toast.error('Failed to load favorites');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user?.id, isLoaded]);

  const handleRemove = async (id: string) => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Please sign in to manage favorites');
        return;
      }
      
      // Call the API endpoint to remove a favorite
      const response = await fetch(`/api/favorites/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fusionId: id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error removing favorite:', errorData);
        toast.error('Failed to remove from favorites');
        return;
      }
      
      setFavorites(favorites.filter(fusion => fusion.id !== id));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Error Loading Favorites
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <SparklesText 
          text="Your Favorites"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Your collection of favorite Pokémon fusions
        </p>
      </div>

      <FavoritesAuthGate>
        {favorites.length === 0 ? (
          <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
            <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">You don't have any favorites yet</p>
            <p className="text-gray-600 dark:text-gray-400">
              Start creating fusions and add them to your favorites!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
            {favorites.map((fusion) => (
              <FusionCard
                key={fusion.id}
                fusion={fusion}
                onDelete={handleRemove}
                showActions={true}
              />
            ))}
          </div>
        )}
      </FavoritesAuthGate>
    </div>
  );
} 