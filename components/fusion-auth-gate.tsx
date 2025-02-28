"use client";

import { AuthGate } from "@/components/auth-gate";

interface FusionAuthGateProps {
  children: React.ReactNode;
}

export function FusionAuthGate({ children }: FusionAuthGateProps) {
  return (
    <AuthGate
      title="Create Your Own Fusion"
      message="Sign in to create unique Pokémon fusions and save them to your collection!"
    >
      {children}
    </AuthGate>
  );
} 