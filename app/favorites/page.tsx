"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Fusion } from "@/types";
import FusionCard from "@/components/fusion-card";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import { PageHeader } from "@/components/page-header";
import { PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="container py-8">
      <PageHeader className="pb-8">
        <PageHeaderHeading>Your Favorites</PageHeaderHeading>
        <PageHeaderDescription>
          View and manage your favorite Pokémon fusions.
        </PageHeaderDescription>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyPlaceholder className="border-none">
          <EmptyPlaceholder.Icon name="warning" />
          <EmptyPlaceholder.Title>Error</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            {error}
          </EmptyPlaceholder.Description>
        </EmptyPlaceholder>
      ) : favorites.length === 0 ? (
        <EmptyPlaceholder className="border-none">
          <EmptyPlaceholder.Icon name="heart" />
          <EmptyPlaceholder.Title>No favorites yet</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            Generate some fusions and add them to your favorites!
          </EmptyPlaceholder.Description>
        </EmptyPlaceholder>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((fusion) => (
            <FusionCard key={fusion.id} fusion={fusion} />
          ))}
        </div>
      )}
    </div>
  );
} 