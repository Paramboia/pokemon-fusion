"use client";

import { AuthGate } from "@/components/auth-gate";

interface FavoritesAuthGateProps {
  children: React.ReactNode;
}

export function FavoritesAuthGate({ children }: FavoritesAuthGateProps) {
  return (
    <AuthGate
      title="Your Favorite Fusions"
      message="Sign in to view and manage your favorite Pokémon fusions!"
    >
      {children}
    </AuthGate>
  );
} 