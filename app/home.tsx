"use client";

import { useState, useEffect, Suspense } from "react";
import { usePokemon, useFusion } from "@/hooks";
import { PokemonSelector } from "@/components/pokemon-selector";
import { Button, Card, SuccessAlert } from "@/components/ui";
import { Loader2, Download, Heart, Send, AlertCircle, CreditCard, Info } from "lucide-react";
import { SparklesText } from "@/components/ui";
import type { Pokemon } from "@/types";
import { toast } from "sonner";
import Image from "next/image";
import { useAuthContext } from "@/contexts/auth-context";
import { HomeAuthGate } from "@/components/home-auth-gate";
import FusionCard from "@/components/fusion-card";
import { useAuth } from "@clerk/nextjs";
import { AlternatingText } from "@/components/ui";
import { CreditGate } from "@/components/credit-gate";
import { useSearchParams, useRouter } from "next/navigation";
import { useCredits } from "@/hooks/useCredits";
import { ProgressStepper } from '@/components/ui/progress-stepper';
import { FusionStepsCard } from '@/components/ui/fusion-steps-card';

// Create a separate component to handle payment success detection
function PaymentSuccessHandler({ onSuccess }: { onSuccess: (message: string) => void }) {
  const searchParams = useSearchParams();
  const { fetchBalance } = useCredits();
  const router = useRouter();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    // Debug log to see if we're detecting the session_id
    console.log('Payment handler checking for session_id:', sessionId);
    
    if (sessionId) {
      console.log('Payment success detected with session ID:', sessionId);
      
      // First refresh the balance
      fetchBalance();
      
      // Clean up the URL by removing the session_id parameter
      // This prevents the success message from showing again if the user refreshes the page
      const newUrl = window.location.pathname;
      router.replace(newUrl, { scroll: false });
      
      // Use setTimeout to ensure the toast appears after the component is fully mounted
      setTimeout(() => {
        // Use a more persistent toast that requires manual dismissal
        toast.success("Payment successful! Your credits have been added to your account.", {
          id: 'payment-success-toast',
          duration: 8000, // 8 seconds
        });
        
        // Notify parent component to show the success message
        onSuccess("Congrats! Credits added successfully to your account!");
        
        console.log('Success toast and alert triggered');
      }, 500);
    }
  }, [searchParams, fetchBalance, onSuccess, router]);

  return null; // This component doesn't render anything
}

export default function Home() {
  const { pokemonList, isLoading } = usePokemon();
  const { 
    generating, 
    fusionImage, 
    fusionId, 
    error, 
    isPaymentRequired, 
    isLocalFallback, 
    generateFusion,
    // New multi-step UI states
    generationState,
    isMultiStepEnabled
  } = useFusion();
  const { isSignedIn } = useAuthContext();
  const { getToken } = useAuth();
  const [selectedPokemon, setSelectedPokemon] = useState<{
    pokemon1: Pokemon | null;
    pokemon2: Pokemon | null;
  }>({
    pokemon1: null,
    pokemon2: null,
  });
  const [fusionName, setFusionName] = useState<string>("");
  const [isLiked, setIsLiked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  // Use a fixed success message that includes both parts
  const [successMessage, setSuccessMessage] = useState("Congrats! New Pokémon Fusion generated with success!");

  // Handler for payment success
  const handlePaymentSuccess = (message: string) => {
    console.log('handlePaymentSuccess called with message:', message);
    
    // Show a toast directly here as a backup
    toast.success("Payment successful! Credits added to your account.", {
      id: 'payment-success-toast-backup',
      duration: 8000,
    });
    
    setSuccessMessage(message);
    setShowSuccessAlert(true);
  };

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Effect to show success alert when fusion is generated
  useEffect(() => {
    if (fusionImage && !generating && !error && !isLocalFallback) {
      setShowSuccessAlert(true);
    }
  }, [fusionImage, generating, error, isLocalFallback]);

  const handlePokemonSelect = (pokemon1: Pokemon | null, pokemon2: Pokemon | null) => {
    setSelectedPokemon({ pokemon1, pokemon2 });
    
    // Generate a fusion name if both Pokémon are selected
    if (pokemon1 && pokemon2) {
      const name1 = pokemon1.name;
      const name2 = pokemon2.name;
      
      // Create a more creative fusion name
      const fusionName = generateCreativeFusionName(name1, name2);
      
      setFusionName(fusionName);
    } else {
      setFusionName("");
    }
  };

  // Function to generate creative fusion names
  const generateCreativeFusionName = (name1: string, name2: string): string => {
    // Try different fusion techniques and pick the best one
    const options: string[] = [];
    
    // Option 1: Take beginning of first name and end of second
    const firstStart = name1.substring(0, Math.ceil(name1.length / 2));
    const secondEnd = name2.substring(Math.floor(name2.length / 2));
    options.push(firstStart + secondEnd);
    
    // Option 2: Take first syllable of first name and last syllable of second
    // (Simple approximation: first consonant cluster + vowel from first name, 
    // and last vowel + consonant cluster from second name)
    const firstSyllable = name1.match(/^[^aeiou]*[aeiou]+/i)?.[0] || name1.substring(0, 2);
    const lastSyllable = name2.match(/[aeiou]+[^aeiou]*$/i)?.[0] || name2.substring(name2.length - 2);
    options.push(firstSyllable + lastSyllable);
    
    // Option 3: Find common letters and blend around them
    const commonLetters = findCommonLetters(name1, name2);
    if (commonLetters.length > 0) {
      // Use the first common letter as a joining point
      const commonLetter = commonLetters[0];
      const name1Index = name1.indexOf(commonLetter);
      const name2Index = name2.indexOf(commonLetter);
      
      if (name1Index > 0 && name2Index < name2.length - 1) {
        const blendedName = name1.substring(0, name1Index + 1) + name2.substring(name2Index + 1);
        options.push(blendedName);
      }
    }
    
    // Option 4: Alternate syllables (simplified)
    const name1Parts = name1.match(/[^aeiou]*[aeiou]+/gi) || [name1];
    const name2Parts = name2.match(/[^aeiou]*[aeiou]+/gi) || [name2];
    
    if (name1Parts.length > 0 && name2Parts.length > 0) {
      options.push(name1Parts[0] + name2Parts[name2Parts.length - 1]);
    }
    
    // Choose the best option (for now, just pick the shortest one that's at least 4 chars)
    const validOptions = options.filter(name => name.length >= 4);
    const bestOption = validOptions.sort((a, b) => a.length - b.length)[0] || options[0];
    
    // Capitalize the first letter
    return bestOption.charAt(0).toUpperCase() + bestOption.slice(1).toLowerCase();
  };
  
  // Helper function to find common letters between two strings
  const findCommonLetters = (str1: string, str2: string): string[] => {
    const common: string[] = [];
    const str1Lower = str1.toLowerCase();
    const str2Lower = str2.toLowerCase();
    
    for (let i = 0; i < str1Lower.length; i++) {
      if (str2Lower.includes(str1Lower[i]) && !common.includes(str1Lower[i])) {
        common.push(str1Lower[i]);
      }
    }
    
    return common;
  };

  const handleGenerateFusion = async () => {
    if (!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2) {
      toast.error("Please select two Pokémon to fuse");
      return;
    }

    try {
      const pokemon1 = selectedPokemon.pokemon1;
      const pokemon2 = selectedPokemon.pokemon2;
      
      // Get the official artwork URLs for display purposes
      const image1Url = pokemon1.sprites.other['official-artwork'].front_default;
      const image2Url = pokemon2.sprites.other['official-artwork'].front_default;
      
      // Log the parameters being passed to generateFusion
      console.log('Generating fusion with parameters:', {
        pokemon1Id: pokemon1.id,
        pokemon2Id: pokemon2.id,
        name1: pokemon1.name,
        name2: pokemon2.name,
        fusionName
      });
      
      await generateFusion(
        image1Url,
        image2Url,
        pokemon1.name,
        pokemon2.name,
        pokemon1.id,
        pokemon2.id,
        fusionName
      );
      
      // Success toast is now handled in the useFusion hook
    } catch (error) {
      console.error("Error in handleGenerateFusion:", error);
      toast.error("Failed to start fusion generation. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Suspense boundary for the payment success handler */}
        <Suspense fallback={null}>
          <PaymentSuccessHandler onSuccess={handlePaymentSuccess} />
        </Suspense>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Pokémon Fusion Generator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Create amazing new Pokémon by fusing two different species together!
          </p>
        </div>

        {/* Success Alert */}
        {showSuccessAlert && (
          <div className="mb-8 flex justify-center">
            <SuccessAlert 
              message={successMessage} 
              isVisible={showSuccessAlert}
              onClose={() => setShowSuccessAlert(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Pokémon Selection Section */}
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:!text-white" style={{ ...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { color: 'white !important' } : {}) }}>Select Your Pokémon</h2>
            
            <PokemonSelector
              pokemonList={pokemonList}
              onSelect={handlePokemonSelect}
              selectedPokemon={selectedPokemon}
            />
            
            <div className="mt-8 w-full flex justify-center">
              <HomeAuthGate>
                {/* Show Generate Button or Fusion Steps Card */}
                {!generating ? (
                  <Button
                    onClick={handleGenerateFusion}
                    disabled={!selectedPokemon.pokemon1 || !selectedPokemon.pokemon2}
                    className="px-8 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    size="lg"
                  >
                    Generate Fusion
                  </Button>
                ) : isMultiStepEnabled ? (
                  <FusionStepsCard
                    steps={generationState.steps}
                    currentStep={generationState.currentStep}
                    className="mt-4"
                  />
                ) : (
                  <Button
                    disabled={true}
                    className="px-8 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    size="lg"
                  >
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <AlternatingText 
                      messages={[
                        "Generating Fusion...", 
                        "It might take a few minutes...",
                        "Please do not refresh...",
                        "Please do not close the page...",
                        "AI is still cooking...",
                        "Thank you for your patience..."
                      ]} 
                      interval={3000} 
                    />
                  </Button>
                )}
              </HomeAuthGate>
            </div>
          </div>

          {/* Fusion Result Section */}
          {fusionImage && (
            <div className="mt-12 flex flex-col items-center">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:!text-white" style={{ ...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { color: 'white !important' } : {}) }}>Your Pokémon Fusion</h2>
              
              <div className="w-full max-w-md">
                <FusionCard 
                  fusion={{
                    id: fusionId || "temp-fusion",
                    fusionName: fusionName || "Unnamed Fusion",
                    fusionImage: fusionImage,
                    pokemon1Name: selectedPokemon.pokemon1?.name || "",
                    pokemon2Name: selectedPokemon.pokemon2?.name || "",
                    isLocalFallback: isLocalFallback,
                    likes: 0,
                    createdAt: new Date().toISOString()
                  }}
                  showActions={true}
                  onLike={() => setIsLiked(!isLiked)}
                  showFallbackWarning={true}
                />
              </div>
            </div>
          )}

          {/* Error Messages and Payment Required Message */}
          {(error && !isLocalFallback) || isPaymentRequired ? (
            <div className="mt-6 flex justify-center">
              <CreditGate 
                title="Ups... You need Credits"
                message={error && !isLocalFallback ? error : "Purchase credits to continue creating amazing Pokémon fusions!"}
                buttonText="Get Credits"
                redirectPath="/credits"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
} 