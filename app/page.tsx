"use client";

import { useState } from "react";
import { usePokemon } from "@/hooks/use-pokemon";
import { useFusion } from "@/hooks/use-fusion";
import { PokemonSelector } from "@/components/pokemon-selector";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Heart, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SparklesText } from "@/components/ui/sparkles-text";
import type { Pokemon } from "@/types/pokemon";
import { toast } from "sonner";
import Image from "next/image";

export default function Home() {
  const { pokemonList, isLoading } = usePokemon();
  const { generating, fusionImage, generateFusion } = useFusion();
  const [selectedPokemon, setSelectedPokemon] = useState<{
    pokemon1: Pokemon | null;
    pokemon2: Pokemon | null;
  }>({
    pokemon1: null,
    pokemon2: null,
  });
  const [fusionName, setFusionName] = useState<string>("");
  const [isLiked, setIsLiked] = useState(false);

  const handlePokemonSelect = (pokemon1: Pokemon | null, pokemon2: Pokemon | null) => {
    setSelectedPokemon({ pokemon1, pokemon2 });
    
    // Generate fusion name only if both Pokémon are selected
    if (pokemon1 && pokemon2) {
      const name1 = pokemon1.name;
      const name2 = pokemon2.name;
      const fusionName = name1.substring(0, Math.ceil(name1.length / 2)) + 
                         name2.substring(Math.floor(name2.length / 2));
      setFusionName(fusionName);
    }
  };

  const handleGenerateFusion = async () => {
    if (!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2) {
      toast.error("Please select two Pokémon first");
      return;
    }

    try {
      await generateFusion(
        selectedPokemon.pokemon1.sprites.other["official-artwork"].front_default,
        selectedPokemon.pokemon2.sprites.other["official-artwork"].front_default
      );
      toast.success("Fusion generated successfully!");
    } catch (error) {
      toast.error("Failed to generate fusion");
    }
  };

  const handleDownload = () => {
    if (!fusionImage) return;
    
    // Create a temporary anchor element
    const link = document.createElement("a");
    link.href = fusionImage;
    link.download = `${fusionName || "pokemon-fusion"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded successfully!");
  };

  const handleShare = async () => {
    if (!fusionImage) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PokéFusion: ${fusionName}`,
          text: `Check out my Pokémon fusion: ${fusionName}!`,
          url: window.location.href,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        console.error("Error sharing:", error);
        toast.error("Failed to share");
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? "Removed from favorites" : "Added to favorites");
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
          text="Pokémon Fusion"
          className="text-4xl md:text-5xl font-bold mb-4 text-gray-800 dark:text-gray-100"
        />
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Create unique Pokémon combinations with our fusion generator
        </p>
      </div>

      <PokemonSelector
        pokemonList={pokemonList}
        onSelect={handlePokemonSelect}
        selectedPokemon={selectedPokemon}
      />

      <div className="mt-10 flex justify-center">
        <Button 
          onClick={handleGenerateFusion}
          disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2 || generating}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Fusion"
          )}
        </Button>
      </div>

      {fusionImage && (
        <Card className="mt-10 relative group overflow-hidden h-full flex flex-col max-w-md mx-auto">
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="w-full h-64 relative">
              {fusionImage && (
                <div className="relative w-full h-full">
                  <img
                    src={fusionImage}
                    alt={fusionName}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLike}
                className="text-white hover:bg-white/20"
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleShare}
                className="text-white hover:bg-white/20"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">{fusionName}</h3>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString()}
              </p>
              <div className="flex items-center gap-1">
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{isLiked ? 1 : 0}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
