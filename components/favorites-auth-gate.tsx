"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuthContext } from "@/contexts/auth-context";
import { AlertCircle } from "lucide-react";

interface FavoritesAuthGateProps {
  children: React.ReactNode;
}

export function FavoritesAuthGate({ children }: FavoritesAuthGateProps) {
  const { authError } = useAuthContext();
  
  // If there's an auth error, show it
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Authentication Issue
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {authError}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Please try signing out and signing back in.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <AuthGate
      title="Your Favorite Fusions"
      message="Sign in to save and view your favorite Pokémon fusions in one place!"
    >
      {children}
    </AuthGate>
  );
} 