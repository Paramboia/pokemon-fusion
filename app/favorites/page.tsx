"use client";

import { useFavorites } from "@/hooks/use-favorites";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function FavoritesPage() {
  const { favorites, loading } = useFavorites();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Your Favorite Fusions</h1>
      
      {favorites.length === 0 ? (
        <div className="text-center text-gray-400">
          <p>You haven't saved any fusions yet.</p>
          <p>Create some fusions and save them to see them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fusion) => (
            <Card key={fusion.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={fusion.image_url}
                  alt={`Fusion of ${fusion.pokemon1_name} and ${fusion.pokemon2_name}`}
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">
                  {fusion.pokemon1_name} + {fusion.pokemon2_name}
                </h3>
                <p className="text-gray-400 text-sm">
                  Created on {new Date(fusion.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 