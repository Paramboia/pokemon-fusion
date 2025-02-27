"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PopularFusion {
  id: string;
  image_url: string;
  pokemon1_name: string;
  pokemon2_name: string;
  likes: number;
  created_at: string;
  creator_name: string;
}

export default function PopularPage() {
  const [fusions, setFusions] = useState<PopularFusion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch popular fusions from your API
    setLoading(false);
  }, []);

  const handleLike = async (fusionId: string) => {
    try {
      // TODO: Implement like functionality
      toast.success("Added to favorites!");
    } catch (error) {
      toast.error("Failed to like fusion");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Most Popular Fusions</h1>
      
      {fusions.length === 0 ? (
        <div className="text-center text-gray-400">
          <p>No popular fusions yet.</p>
          <p>Be the first to create and share a fusion!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fusions.map((fusion) => (
            <Card key={fusion.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={fusion.image_url}
                  alt={`Fusion of ${fusion.pokemon1_name} and ${fusion.pokemon2_name}`}
                  className="object-contain w-full h-full"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={() => handleLike(fusion.id)}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">
                  {fusion.pokemon1_name} + {fusion.pokemon2_name}
                </h3>
                <p className="text-gray-400 text-sm">
                  By {fusion.creator_name} • {fusion.likes} likes
                </p>
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