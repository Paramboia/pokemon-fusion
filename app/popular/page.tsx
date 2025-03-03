"use client";

import { SparklesText } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import FusionCard from "@/components/fusion-card";
import { PopularAuthGate } from "@/components/popular-auth-gate";
import { dbService, FusionDB } from "@/lib/supabase-client";
import { toast } from "sonner";

export default function PopularPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [popularFusions, setPopularFusions] = useState<FusionDB[]>([]);

  useEffect(() => {
    const fetchPopularFusions = async () => {
      try {
        setIsLoading(true);
        const fusions = await dbService.getPopularFusions(12); // Fetch top 12 fusions
        setPopularFusions(fusions);
      } catch (error) {
        console.error('Error fetching popular fusions:', error);
        toast.error('Failed to load popular fusions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularFusions();
  }, []);

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
          text="Popular Fusions"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Check out the most popular Pokémon fusions created by our community
        </p>
      </div>

      <PopularAuthGate>
        {popularFusions.length === 0 ? (
          <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
            <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">No fusions found</p>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to create a Pokémon fusion!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
            {popularFusions.map((fusion) => (
              <FusionCard 
                key={fusion.id} 
                fusion={fusion}
                showActions={false}
              />
            ))}
          </div>
        )}
      </PopularAuthGate>
    </div>
  );
} 