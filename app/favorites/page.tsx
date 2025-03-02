"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Fusion } from "@/types";
import FusionCard from "@/components/fusion-card";
import { SparklesText } from "@/components/ui";
import { Loader2, AlertCircle } from "lucide-react";

export default function FavoritesPage() {
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const [favorites, setFavorites] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      if (!isLoaded || !isSignedIn) {
        console.log("Favorites page - User not authenticated yet");
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log("Favorites page - Fetching favorites for user:", userId);
        
        // Get the authentication token
        const token = await getToken();
        console.log("Favorites page - Auth token obtained:", token ? "Yes" : "No");
        
        // Prepare headers with authentication
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        // Make the API request
        const response = await fetch(`/api/favorites?userId=${userId}`, {
          method: "GET",
          headers,
        });
        
        console.log("Favorites page - API response status:", response.status);
        
        if (!response.ok) {
          let errorMessage = "Failed to load favorites";
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the status text
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          
          console.error("Favorites page - Error fetching favorites:", errorMessage);
          
          if (response.status === 401) {
            setError("You need to be signed in to view favorites");
            toast.error("Authentication required to view favorites");
          } else if (response.status === 404) {
            setError("No favorites found. Your account may not be properly synced.");
            toast.error("User account not found in database");
          } else {
            setError(errorMessage);
            toast.error(errorMessage);
          }
          
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log("Favorites page - Received favorites data:", data);
        
        if (data.favorites && Array.isArray(data.favorites)) {
          setFavorites(data.favorites);
          console.log("Favorites page - Set favorites count:", data.favorites.length);
        } else {
          console.warn("Favorites page - Unexpected data format:", data);
          setFavorites([]);
          setError("Unexpected data format received from server");
        }
      } catch (err) {
        console.error("Favorites page - Error in fetchFavorites:", err);
        setError("An error occurred while fetching favorites");
        toast.error("Failed to load favorites");
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [userId, isLoaded, isSignedIn, getToken]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
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
    );
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

      {favorites.length === 0 ? (
        <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
          <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">You don't have any favorites yet</p>
          <p className="text-gray-600 dark:text-gray-400">
            Start creating fusions and add them to your favorites!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fusion) => (
            <FusionCard key={fusion.id} fusion={fusion} />
          ))}
        </div>
      )}
    </div>
  );
} 