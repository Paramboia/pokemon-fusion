"use client";

import { AuthGate } from "@/components/auth-gate";

interface FavoritesAuthGateProps {
  children: React.ReactNode;
}

export function FavoritesAuthGate({ children }: FavoritesAuthGateProps) {
  return (
    <AuthGate
      title="Your Favorite Fusions"
      message="Sign in to save and view your favorite Pokémon fusions in one place!"
    >
      {children}
    </AuthGate>
  );
} 