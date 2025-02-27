"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePokemon } from "@/hooks/use-pokemon";
import type { Pokemon } from "@/types/pokemon";
import { useFusion } from '@/hooks/use-fusion';
import { PokemonSelector } from '@/components/pokemon-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";

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
    } catch (error) {
      toast.error("Failed to generate fusion");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Create Your Pokémon Fusion
        </h1>
        
        <div className="text-center mb-8">
          <p className="text-gray-400">
            Select two Pokémon and see what happens when they combine!
          </p>
        </div>

        {isLoadingList ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <PokemonSelector
              pokemonList={pokemonList}
              onSelect={handlePokemonSelect}
              selectedPokemon={selectedPokemon}
            />

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2 || generating}
                className="w-full max-w-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Fusion...
                  </>
                ) : (
                  'Create Fusion'
                )}
              </Button>
            </div>

            {fusionImage && (
              <div className="mt-8">
                <Card className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img
                      src={fusionImage}
                      alt="Pokemon Fusion"
                      className="object-contain w-full h-full"
                    />
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
