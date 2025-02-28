"use client";

import { useState } from "react";
import { usePokemon } from "@/hooks/use-pokemon";
import { useFusion } from "@/hooks/use-fusion";
import { PokemonSelector } from "@/components/pokemon-selector";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Share } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SparklesText } from "@/components/ui/sparkles-text";
import type { Pokemon } from "@/types/pokemon";
import { toast } from "sonner";

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

  const handlePokemonSelect = (pokemon1: Pokemon, pokemon2: Pokemon) => {
    setSelectedPokemon({ pokemon1, pokemon2 });
    
    // Generate fusion name
    const name1 = pokemon1.name;
    const name2 = pokemon2.name;
    const fusionName = name1.substring(0, Math.ceil(name1.length / 2)) + 
                       name2.substring(Math.floor(name2.length / 2));
    setFusionName(fusionName);
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
          className="text-4xl md:text-5xl font-bold mb-4 text-gray-800"
        />
        <p className="text-xl text-gray-600">
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
        <Card className="mt-10 p-6 rounded-lg shadow-md bg-white max-w-md mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold capitalize text-gray-800">{fusionName}</h2>
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-64">
              <img
                src={fusionImage}
                alt={fusionName}
                className="object-contain w-full h-full"
              />
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              className="border-indigo-500 hover:bg-indigo-600 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="border-indigo-500 hover:bg-indigo-600 hover:text-white"
            >
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
