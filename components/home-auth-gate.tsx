"use client";

import { AuthGate } from "@/components/auth-gate";

interface HomeAuthGateProps {
  children: React.ReactNode;
}

export function HomeAuthGate({ children }: HomeAuthGateProps) {
  return (
    <AuthGate
      title="Create Pokémon Fusions"
      message="Sign in to create unique Pokémon fusions and save them to your collection!"
    >
      {children}
    </AuthGate>
  );
} 