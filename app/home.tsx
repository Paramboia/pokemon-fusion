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
    // ... existing code ...
  }
  
  // ... rest of the component ...
} 