"use client";

import { AuthGate } from "@/components/auth-gate";

interface GalleryAuthGateProps {
  children: React.ReactNode;
}

export function GalleryAuthGate({ children }: GalleryAuthGateProps) {
  return (
    <AuthGate
      title="Your Fusions Gallery"
      message="Sign in to view and manage your generated Pokémon fusions!"
    >
      {children}
    </AuthGate>
  );
} 