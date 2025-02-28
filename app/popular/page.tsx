"use client";

import { SparklesText } from "@/components/ui/sparkles-text";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { FusionCard } from "@/components/fusion-card";
import { PopularAuthGate } from "@/components/popular-auth-gate";

export default function PopularPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [popularFusions, setPopularFusions] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // Mock popular fusions data with the structure expected by FusionCard
      setPopularFusions([
        { 
          id: "1", 
          user_id: "user1",
          pokemon_1_id: 25,
          pokemon_2_id: 1,
          fusion_name: "Pikasaur", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
          likes: 245,
          created_at: new Date().toISOString()
        },
        { 
          id: "2", 
          user_id: "user1",
          pokemon_1_id: 4,
          pokemon_2_id: 7,
          fusion_name: "Chartle", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",
          likes: 189,
          created_at: new Date().toISOString()
        },
        { 
          id: "3", 
          user_id: "user1",
          pokemon_1_id: 1,
          pokemon_2_id: 4,
          fusion_name: "Bulbmander", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
          likes: 156,
          created_at: new Date().toISOString()
        },
        { 
          id: "4", 
          user_id: "user1",
          pokemon_1_id: 7,
          pokemon_2_id: 25,
          fusion_name: "Squirchu", 
          fusion_image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",
          likes: 132,
          created_at: new Date().toISOString()
        },
      ]);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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
          text="Popular Fusions"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Check out the most popular Pokémon fusions created by our community
        </p>
      </div>

      <PopularAuthGate>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {popularFusions.map((fusion) => (
            <FusionCard 
              key={fusion.id} 
              fusion={fusion}
              showActions={false}
            />
          ))}
        </div>
      </PopularAuthGate>
    </div>
  );
} 