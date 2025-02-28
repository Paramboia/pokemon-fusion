"use client";

import { SparklesText } from "@/components/ui/sparkles-text";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FusionCard } from "@/components/fusion-card";
import { FavoritesAuthGate } from "@/components/favorites-auth-gate";

export default function FavoritesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // Mock favorites data with the structure expected by FusionCard
      setFavorites([
        { 
          id: "1", 
          user_id: "user1",
          pokemon_1_id: 25,
          pokemon_2_id: 1,
          fusion_name: "Pikasaur", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
          likes: 24,
          created_at: new Date().toISOString()
        },
        { 
          id: "2", 
          user_id: "user1",
          pokemon_1_id: 4,
          pokemon_2_id: 7,
          fusion_name: "Chartle", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",
          likes: 18,
          created_at: new Date().toISOString()
        },
      ]);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (id: string) => {
    setFavorites(favorites.filter(fusion => fusion.id !== id));
    toast.success("Removed from favorites");
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