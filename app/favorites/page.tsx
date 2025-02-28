"use client";

import { SparklesText } from "@/components/ui/sparkles-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function FavoritesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // Mock favorites data
      setFavorites([
        { id: 1, name: "Pikasaur", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" },
        { id: 2, name: "Chartle", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" },
      ]);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (id: number) => {
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
        <p className="text-xl text-gray-300">
          Your collection of favorite Pokémon fusions
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center p-10 bg-gray-800 bg-opacity-50 rounded-lg">
          <p className="text-xl mb-4">You don't have any favorites yet</p>
          <p className="text-gray-400">
            Start creating fusions and add them to your favorites!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {favorites.map((fusion) => (
            <Card key={fusion.id} className="card-retro p-4 flex flex-col items-center">
              <div className="flex justify-between w-full mb-2">
                <h3 className="text-xl font-bold capitalize">{fusion.name}</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemove(fusion.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              <div className="w-40 h-40 my-4">
                <img 
                  src={fusion.image} 
                  alt={fusion.name} 
                  className="w-full h-full object-contain"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 