"use client";

import { SparklesText } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FusionCard } from "@/components/fusion-card";
import { FavoritesAuthGate } from "@/components/favorites-auth-gate";
import { dbService, FusionDB } from "@/lib/supabase-client";
import { useUser } from "@clerk/nextjs";

export default function FavoritesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FusionDB[]>([]);
  const { user } = useUser();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true);
        const userId = user?.id;
        
        if (!userId) {
          return;
        }
        
        const userFavorites = await dbService.getUserFavorites(userId);
        setFavorites(userFavorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Failed to load favorites');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user?.id]);

  const handleRemove = async (id: string) => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Please sign in to manage favorites');
        return;
      }
      
      await dbService.removeFavorite(userId, id);
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