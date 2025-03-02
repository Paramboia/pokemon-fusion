"use client";

import { useState } from "react";
import { usePokemon, useFusion } from "@/hooks";
import { PokemonSelector } from "@/components/pokemon-selector";
import { Button, Card } from "@/components/ui";
import { Loader2, Download, Heart, Send, AlertCircle, CreditCard, Info } from "lucide-react";
import { SparklesText } from "@/components/ui";
import type { Pokemon } from "@/types";
import { toast } from "sonner";
import Image from "next/image";
import { useAuth } from "@/contexts";
import { AuthCtaButton } from "@/components/auth-cta-button";
import { FusionAuthGate } from "@/components/fusion-auth-gate";

export default function Home() {
  const { pokemonList, isLoading } = usePokemon();
  const { generating, fusionImage, error, isPaymentRequired, isLocalFallback, generateFusion } = useFusion();
  const { isSignedIn } = useAuth();
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
    
    // Generate a fusion name if both Pokémon are selected
    if (pokemon1 && pokemon2) {
      const name1 = pokemon1.name;
      const name2 = pokemon2.name;
      
      // Take first half of first name and second half of second name
      const firstHalf = name1.substring(0, Math.ceil(name1.length / 2));
      const secondHalf = name2.substring(Math.floor(name2.length / 2));
      
      setFusionName(firstHalf + secondHalf);
    } else {
      setFusionName("");
    }
  };

  const handleGenerateFusion = async () => {
    if (!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2) {
      toast.error("Please select two Pokémon to fuse");
      return;
    }

    try {
      const pokemon1 = selectedPokemon.pokemon1;
      const pokemon2 = selectedPokemon.pokemon2;
      
      // Get the official artwork URLs
      const image1Url = pokemon1.sprites.other['official-artwork'].front_default;
      const image2Url = pokemon2.sprites.other['official-artwork'].front_default;
      
      await generateFusion(
        image1Url,
        image2Url,
        pokemon1.name,
        pokemon2.name,
        pokemon1.id,
        pokemon2.id
      );
      
      toast.success("Fusion generated successfully!");
    } catch (error) {
      console.error("Error generating fusion:", error);
      // Error is already handled in the useFusion hook
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
          <div className="text-gray-800 dark:text-white">
            <SparklesText text="Pokémon Fusion" />
          </div>
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-white max-w-2xl">
          Create unique Pokémon combinations with our fusion generator
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Pokémon Selection Section */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Select Your Pokémon</h2>
          
          <PokemonSelector
            pokemonList={pokemonList}
            onSelect={handlePokemonSelect}
            selectedPokemon={selectedPokemon}
          />
          
          <div className="mt-8 w-full flex justify-center">
            {isSignedIn ? (
              <Button
                onClick={handleGenerateFusion}
                disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2 || generating}
                className="px-8 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Fusion...
                  </>
                ) : (
                  <>
                    Generate Fusion
                  </>
                )}
              </Button>
            ) : (
              <AuthCtaButton 
                className="px-8 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white"
                ctaText="Sign in to generate"
              >
                Sign in to generate
              </AuthCtaButton>
            )}
          </div>
        </div>

        {/* Fusion Result Section */}
        {fusionImage && (
          <div className="mt-12 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Your Pokémon Fusion</h2>
            
            <Card className="w-full max-w-md overflow-hidden">
              <div className="p-4 flex flex-col items-center">
                <div className="relative w-full aspect-square">
                  <Image
                    src={fusionImage}
                    alt={fusionName || "Pokémon Fusion"}
                    fill
                    className="object-contain"
                  />
                </div>
                
                <h3 className="text-xl font-bold mt-4 capitalize text-gray-800 dark:text-white">
                  {fusionName || "Unnamed Fusion"}
                </h3>
                
                <div className="flex mt-4 gap-2">
                  <Button variant="outline" onClick={() => window.open(fusionImage, '_blank')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  
                  {isSignedIn ? (
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      onClick={() => setIsLiked(!isLiked)}
                    >
                      <Heart className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                      {isLiked ? "Liked" : "Like"}
                    </Button>
                  ) : (
                    <AuthCtaButton 
                      variant="outline"
                      ctaText="Sign in to like"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Like
                    </AuthCtaButton>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mt-6 flex justify-center">
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-4 max-w-md w-full">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-600 dark:text-red-400">Error</h3>
                  <p className="text-sm text-red-600/90 dark:text-red-400/90 mt-1">{error}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Payment Required Message */}
        {isPaymentRequired && (
          <div className="mt-6 flex justify-center">
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-4 max-w-md w-full">
              <div className="flex items-start">
                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-600 dark:text-amber-400">Payment Required</h3>
                  <p className="text-sm text-amber-600/90 dark:text-amber-400/90 mt-1">
                    You've reached the limit of free fusions. Please upgrade your account to continue.
                  </p>
                  <Button className="mt-3" size="sm">
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Local Fallback Message */}
        {isLocalFallback && (
          <div className="mt-6 flex justify-center">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4 max-w-md w-full">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-600 dark:text-blue-400">Using Local Fallback</h3>
                  <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mt-1">
                    The AI fusion service is currently unavailable. We're using a local fallback method instead.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 