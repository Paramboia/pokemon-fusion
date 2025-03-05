"use client";

import { SparklesText } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import FusionCard from "@/components/fusion-card";
import { PopularAuthGate } from "@/components/popular-auth-gate";
import { dbService, FusionDB } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Fusion } from "@/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Define sort options
type SortOption = "newest" | "oldest" | "most_likes" | "less_likes";

export default function PopularPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [popularFusions, setPopularFusions] = useState<Fusion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("most_likes");

  useEffect(() => {
    const fetchPopularFusions = async () => {
      try {
        setIsLoading(true);
        const fusions = await dbService.getPopularFusions(12, sortBy); // Fetch top 12 fusions with sort option
        
        if (!fusions || fusions.length === 0) {
          console.warn("No fusions returned from the database");
          setError("No fusions found in the database");
          setPopularFusions([]);
          return;
        }
        
        // Map FusionDB objects to Fusion objects
        const mappedFusions: Fusion[] = fusions.map(fusion => {
          // Validate fusion image URL
          if (!fusion.fusion_image) {
            console.error(`Missing fusion image for ${fusion.fusion_name || 'unnamed fusion'}`);
          }
          
          // Check if the URL is valid
          const isValidUrl = fusion.fusion_image && 
                            typeof fusion.fusion_image === 'string' && 
                            fusion.fusion_image.startsWith('http');
          
          if (!isValidUrl) {
            console.error(`Invalid fusion image URL for ${fusion.fusion_name}:`, fusion.fusion_image);
          }
          
          return {
            id: fusion.id,
            pokemon1Name: fusion.pokemon_1_name,
            pokemon2Name: fusion.pokemon_2_name,
            fusionName: fusion.fusion_name,
            fusionImage: fusion.fusion_image || '/placeholder-pokemon.svg', // Use fallback if missing
            createdAt: fusion.created_at,
            likes: fusion.likes,
            isLocalFallback: !isValidUrl // Mark as fallback if URL is invalid
          };
        });
        
        setPopularFusions(mappedFusions);
      } catch (error) {
        console.error('Error fetching popular fusions:', error);
        setError('Failed to load popular fusions');
        toast.error('Failed to load popular fusions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularFusions();
  }, [sortBy]); // Re-fetch when sort option changes

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            <SparklesText text="Popular Fusions" />
          </h1>
          <p className="text-lg text-center text-gray-600 dark:text-gray-300 max-w-2xl">
            Check out the most popular Pokémon fusions created by our community
          </p>
        </div>
        
        <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
          <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">Error loading fusions</p>
          <p className="text-gray-600 dark:text-gray-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
          <SparklesText text="Popular Fusions" />
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-gray-300 max-w-2xl">
          Check out the most popular Pokémon fusions created by our community
        </p>
      </div>

      <PopularAuthGate>
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">
              Sort by:
            </Label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger id="sort-select" className="w-[180px] bg-white dark:bg-gray-800 shadow-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800">
                <SelectItem 
                  value="most_likes" 
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  <div className="py-1 px-2 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium">
                    Most likes first
                  </div>
                </SelectItem>
                <SelectItem 
                  value="less_likes" 
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  <div className="py-1 px-2 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium">
                    Less likes first
                  </div>
                </SelectItem>
                <SelectItem 
                  value="newest" 
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  <div className="py-1 px-2 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium">
                    Newest first
                  </div>
                </SelectItem>
                <SelectItem 
                  value="oldest" 
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  <div className="py-1 px-2 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium">
                    Oldest first
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {popularFusions.length === 0 ? (
          <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
            <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">No fusions found</p>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to create a Pokémon fusion!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularFusions.map((fusion) => (
              <div key={fusion.id}>
                <FusionCard 
                  fusion={fusion}
                  showActions={true}
                />
              </div>
            ))}
          </div>
        )}
      </PopularAuthGate>
    </div>
  );
} 