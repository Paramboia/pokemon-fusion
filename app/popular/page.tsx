"use client";

import { SparklesText } from "@/components/ui/sparkles-text";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function PopularPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
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

  // Mock popular fusions data
  const popularFusions = [
    { id: 1, name: "Pikasaur", likes: 245, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" },
    { id: 2, name: "Chartle", likes: 189, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" },
    { id: 3, name: "Bulbmander", likes: 156, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" },
    { id: 4, name: "Squirchu", likes: 132, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <SparklesText 
          text="Popular Fusions"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-300">
          Check out the most popular Pokémon fusions created by our community
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {popularFusions.map((fusion) => (
          <Card key={fusion.id} className="card-retro p-4 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-2 capitalize">{fusion.name}</h3>
            <div className="w-40 h-40 my-4">
              <img 
                src={fusion.image} 
                alt={fusion.name} 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-300">{fusion.likes} likes</p>
          </Card>
        ))}
      </div>
    </div>
  );
} 