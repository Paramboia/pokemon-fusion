"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fusion } from "@/types";
import FusionCard from "@/components/fusion-card";
import { SparklesText } from "@/components/ui";
import { Loader2, AlertCircle } from "lucide-react";
import { FavoritesAuthGate } from "@/components/favorites-auth-gate";
import { useAuthContext } from "@/contexts/auth-context";

export default function FavoritesPage() {
  const { user, isLoaded, isSignedIn } = useAuthContext();
  const [favorites, setFavorites] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch favorites if the user is authenticated
    if (isLoaded && isSignedIn) {
      fetchFavorites();
    }
  }, [user, isLoaded, isSignedIn]);

  async function fetchFavorites() {
    setLoading(true);
    setError(null);
    
    try {
      // Make the API request
      const response = await fetch(`/api/favorites?userId=${user?.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      // Handle 404 (user not found) as a special case
      if (response.status === 404) {
        setError("No favorites found. Your account may not be properly synced.");
        toast.error("User account not found in database");
        setLoading(false);
        return;
      }
      
      // For other non-OK responses, try to get the error message
      if (!response.ok) {
        // If it's a 500 error, it might be because the user has no favorites yet
        // In this case, we'll just show an empty list instead of an error
        if (response.status === 500) {
          console.log("No favorites found or server error, showing empty state");
          setFavorites([]);
          setLoading(false);
          return;
        }
        
        let errorMessage = "Failed to load favorites";
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.favorites && Array.isArray(data.favorites)) {
        setFavorites(data.favorites);
      } else {
        // If we get an unexpected format, just show an empty list
        setFavorites([]);
      }
    } catch (err) {
      console.error("Error in fetchFavorites:", err);
      // For any error, just show the empty state instead of an error message
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <SparklesText
          text="Your Favorites"
          className="text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Your collection of favorite Pokémon fusions
        </p>
      </div>

      <FavoritesAuthGate>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full">
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Error Loading Favorites
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {error}
              </p>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
            <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">No favorites found</p>
            <p className="text-gray-600 dark:text-gray-400">
              Start creating Pokémon fusions and add them to your favorites!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fusion) => (
              <FusionCard key={fusion.id} fusion={fusion} />
            ))}
          </div>
        )}
      </FavoritesAuthGate>
    </div>
  );
} 