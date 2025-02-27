"use client";

import { useState, useEffect } from "react";
import { Loader2, Download, Share2 } from "lucide-react";
import { usePokemon } from "@/hooks/use-pokemon";
import type { Pokemon } from "@/types/pokemon";
import { useFusion } from '@/hooks/use-fusion';
import { PokemonSelector } from '@/components/pokemon-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";
import { SparklesText } from "@/components/ui/sparkles-text";

export default function Home() {
  const { pokemonList, isLoading: isLoadingList } = usePokemon();
  const [selectedPokemon, setSelectedPokemon] = useState<{
    pokemon1: Pokemon | null;
    pokemon2: Pokemon | null;
  }>({
    pokemon1: null,
    pokemon2: null,
  });
  const { generating, generateFusion, fusionImage } = useFusion();

  // Initialize with default Pokemon when list is loaded
  useEffect(() => {
    if (pokemonList && pokemonList.length >= 2) {
      handlePokemonSelect(pokemonList[0], pokemonList[1]);
    }
  }, [pokemonList]);

  const handlePokemonSelect = (pokemon1: Pokemon, pokemon2: Pokemon) => {
    setSelectedPokemon({ pokemon1, pokemon2 });
  };

  const handleGenerate = async () => {
    if (!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2) {
      toast.error("Please select two Pokémon first!");
      return;
    }

    try {
      await generateFusion(
        selectedPokemon.pokemon1.sprites.other['official-artwork'].front_default,
        selectedPokemon.pokemon2.sprites.other['official-artwork'].front_default
      );
      toast.success("Fusion created successfully!");
    } catch (error) {
      toast.error("Failed to generate fusion");
    }
  };

  const handleDownload = () => {
    if (!fusionImage) return;
    
    const link = document.createElement('a');
    link.href = fusionImage;
    link.download = `${selectedPokemon.pokemon1?.name}-${selectedPokemon.pokemon2?.name}-fusion.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded successfully!");
  };

  const handleShare = async () => {
    if (!fusionImage) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Pokémon Fusion',
          text: `Check out my fusion of ${selectedPokemon.pokemon1?.name} and ${selectedPokemon.pokemon2?.name}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      toast.error("Failed to share fusion");
    }
  };

  if (isLoadingList) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <SparklesText 
          text="Pokémon Fusion" 
          colors={{ 
            first: "#4F46E5", // Indigo
            second: "#EC4899"  // Pink
          }}
          className="text-5xl md:text-6xl font-extrabold tracking-tight"
        />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Create unique Pokémon combinations with our fusion generator
        </p>
      </div>
      
      <div className="mb-10">
        <PokemonSelector
          pokemonList={pokemonList}
          onSelect={handlePokemonSelect}
          selectedPokemon={selectedPokemon}
        />

        <div className="mt-8 flex justify-center gap-4">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2 || generating}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-700"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Fusion...
              </>
            ) : (
              'Generate Fusion'
            )}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2}
            className="px-6 py-2 border-gray-200 dark:border-gray-700 hover:bg-gray-900 hover:text-white"
          >
            Save as Favorite
          </Button>
        </div>
      </div>

      {fusionImage && (
        <div className="mt-10 mb-12">
          <Card className="card-retro overflow-hidden rounded-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-center mb-3">
                Your Pokémon Fusion
              </h2>
              {selectedPokemon.pokemon1 && selectedPokemon.pokemon2 && (
                <p className="text-center text-gray-300 mb-4">
                  A fusion of <span className="font-medium capitalize">{selectedPokemon.pokemon1.name}</span> and <span className="font-medium capitalize">{selectedPokemon.pokemon2.name}</span>
                </p>
              )}
            </div>
            <div className="flex justify-center p-6 bg-gray-800 bg-opacity-50">
              <div className="relative w-48 h-48 mx-auto">
                <img
                  src={fusionImage}
                  alt="Pokemon Fusion"
                  className="object-contain w-full h-full"
                />
              </div>
            </div>
            <div className="p-6 flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={handleDownload}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Download
              </Button>
              <Button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                variant="outline"
                size="lg"
              >
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-6">
          Favorite Fusions
        </h2>
        
        <p className="text-center text-gray-700 dark:text-gray-300">
          No favorite fusions saved yet. Create your first fusion!
        </p>
      </div>
    </>
  );
}
