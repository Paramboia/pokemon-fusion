"use client";

import { useState } from "react";
import { usePokemon } from "@/hooks/use-pokemon";
import { useFusion } from "@/hooks/use-fusion";
import { PokemonSelector } from "@/components/pokemon-selector";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Heart, Send, AlertCircle, CreditCard, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SparklesText } from "@/components/ui/sparkles-text";
import type { Pokemon } from "@/types/pokemon";
import { toast } from "sonner";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
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
        selectedPokemon.pokemon2.sprites.other["official-artwork"].front_default,
        selectedPokemon.pokemon1.name,
        selectedPokemon.pokemon2.name,
        selectedPokemon.pokemon1.id,
        selectedPokemon.pokemon2.id
      );
    } catch (error) {
      console.error("Error generating fusion:", error);
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
        {isSignedIn ? (
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
        ) : (
          <AuthCtaButton 
            ctaText="Sign in to Generate"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2}
          />
        )}
      </div>

      {(fusionImage || generating || error) && (
        <FusionAuthGate>
          <Card className="mt-10 relative group overflow-hidden flex flex-col max-w-md w-full mx-auto">
            <div className="flex-grow flex items-center justify-center p-4">
              <div className="w-full h-64 relative">
                {generating ? (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <Loader2 className="h-12 w-12 animate-spin mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Generating your fusion...
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    {isPaymentRequired ? (
                      <>
                        <CreditCard className="h-12 w-12 text-amber-500 mb-2" />
                        <p className="text-sm text-amber-500 text-center px-4">
                          This feature requires a paid Replicate account. Please set up billing to use this feature.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://replicate.com/account/billing', '_blank')}
                          className="mt-4 bg-amber-500 text-white hover:bg-amber-600"
                        >
                          Set Up Billing
                        </Button>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
                        <p className="text-sm text-red-500 text-center px-4">
                          {error}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGenerateFusion}
                          className="mt-4"
                        >
                          Try Again
                        </Button>
                      </>
                    )}
                  </div>
                ) : fusionImage && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={fusionImage}
                      alt={fusionName}
                      className="object-contain max-w-full max-h-full"
                    />
                    {isLocalFallback && (
                      <div className="absolute top-2 right-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-md px-2 py-1 text-xs flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        Fallback Mode
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {!generating && !error && fusionImage && (
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
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 min-h-[80px]">
              <h3 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">
                {generating ? "Generating..." : 
                 error ? (isPaymentRequired ? "Payment Required" : "Generation Failed") : 
                 fusionName}
                {isLocalFallback && !error && (
                  <span className="ml-2 text-xs text-amber-500">(Fallback Mode)</span>
                )}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString()}
                </p>
                {!generating && !error && (
                  <div className="flex items-center gap-1">
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{isLiked ? 1 : 0}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </FusionAuthGate>
      )}
    </div>
  );
}
