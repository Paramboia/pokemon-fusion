"use client";

import { AuthGate } from "@/components/auth-gate";

interface PopularAuthGateProps {
  children: React.ReactNode;
}

export function PopularAuthGate({ children }: PopularAuthGateProps) {
  return (
    <AuthGate
      title="Discover Popular Fusions"
      message="Sign in to see the most popular Pokémon fusions created by our community!"
    >
      {children}
    </AuthGate>
  );
} 