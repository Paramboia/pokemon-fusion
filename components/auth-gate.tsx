"use client";

import { useAuthContext } from "@/contexts/auth-context";
import { SignInButton, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  message?: string;
}

export function AuthGate({ 
  children, 
  fallback,
  title = "Authentication Required",
  message = "Sign in to see amazing Pokémon fusions!"
}: AuthGateProps) {
  const { isSignedIn, isLoaded, authError } = useAuthContext();
  const { signOut } = useClerk();

  // Handle sign out and refresh
  const handleSignOutAndRefresh = async () => {
    try {
      await signOut();
      // Wait a moment before refreshing to allow signOut to complete
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force a refresh anyway
      window.location.reload();
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

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
          <Button 
            className="w-full py-2 text-base"
            onClick={handleSignOutAndRefresh}
          >
            Sign Out and Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md w-full">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {message}
          </p>
          <SignInButton mode="modal">
            <Button className="w-full py-2 text-base">
              Sign In
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 