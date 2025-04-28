"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fusion } from "@/types";
import FusionCard from "@/components/fusion-card";
import { SparklesText } from "@/components/ui";
import { Loader2, AlertCircle } from "lucide-react";
import { GalleryAuthGate } from "@/components/gallery-auth-gate";
import { useAuthContext } from "@/contexts/auth-context";
import { useAuth } from "@clerk/nextjs";
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

export default function GalleryPage() {
  const { user, isLoaded, isSignedIn } = useAuthContext();
  const { getToken } = useAuth();
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    // Only fetch fusions if the user is authenticated
    if (isLoaded && isSignedIn) {
      fetchFusions();
    }
  }, [user, isLoaded, isSignedIn, sortBy]);

  async function fetchFusions() {
    setLoading(true);
    setError(null);
    
    try {
      // Get the authentication token
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      // Make the API request with sort parameter
      const response = await fetch(`/api/fusions?userId=${user?.id}&sort=${sortBy}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });
      
      // Handle 404 (user not found) as a special case
      if (response.status === 404) {
        setError("No fusions found. Your account may not be properly synced.");
        toast.error("User account not found in database");
        setLoading(false);
        return;
      }
      
      // Handle 401 (unauthorized) as a special case
      if (response.status === 401) {
        setError("Authentication required. Please refresh the page and try again.");
        toast.error("Authentication required");
        setLoading(false);
        return;
      }
      
      // For other non-OK responses, try to get the error message
      if (!response.ok) {
        // If it's a 500 error, it might be because the user has no fusions yet
        // In this case, we'll just show an empty list instead of an error
        if (response.status === 500) {
          console.log("No fusions found or server error, showing empty state");
          setFusions([]);
          setLoading(false);
          return;
        }
        
        let errorMessage = "Failed to load fusions";
        
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
      
      if (data.fusions && Array.isArray(data.fusions)) {
        setFusions(data.fusions);
      } else {
        // If we get an unexpected format, just show an empty list
        setFusions([]);
      }
    } catch (err) {
      console.error("Error in fetchFusions:", err);
      // For any error, just show the empty state instead of an error message
      setFusions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
          <SparklesText text="Your Fusions" />
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-gray-300 max-w-2xl">
          Your collection of generated Pokémon fusions
        </p>
      </div>

      <GalleryAuthGate>
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
                Error Loading Fusions
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {error}
              </p>
            </div>
          </div>
        ) : fusions.length === 0 ? (
          <div className="text-center p-10 bg-gray-100 dark:bg-gray-800 bg-opacity-50 rounded-lg">
            <p className="text-xl mb-4 text-gray-800 dark:text-gray-200">No fusions found</p>
            <p className="text-gray-600 dark:text-gray-400">
              Start creating Pokémon fusions to see them in your gallery!
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-select" className="text-sm font-medium">
                  Sort by first:
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
                      value="newest" 
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      Newest
                    </SelectItem>
                    <SelectItem 
                      value="oldest" 
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      Oldest
                    </SelectItem>
                    <SelectItem 
                      value="most_likes" 
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      Most likes
                    </SelectItem>
                    <SelectItem 
                      value="less_likes" 
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      Less likes
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fusions.map((fusion) => (
                <div key={fusion.id}>
                  <FusionCard 
                    fusion={fusion}
                    showActions={true}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </GalleryAuthGate>
    </div>
  );
} 