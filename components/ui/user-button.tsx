"use client";

import { UserButton as ClerkUserButton, SignInButton, useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { event as gaEvent } from "@/lib/gtag";

export function UserButton() {
  const { isSignedIn, user, isLoaded } = useUser();

  // Track auth state changes
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Track successful sign-in/sign-up
      gaEvent({
        action: 'user_authenticated',
        category: 'authentication',
        label: user.id,
        value: undefined
      });
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <User className="h-5 w-5 text-gray-400" />
      </Button>
    );
  }

  if (isSignedIn) {
    return (
      <ClerkUserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonAvatarBox: "h-9 w-9",
            userButtonTrigger: "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700 rounded-full"
          }
        }}
        signOutCallback={() => {
          // Track sign-out event
          gaEvent({
            action: 'user_sign_out',
            category: 'authentication',
            label: user?.id || 'unknown',
            value: undefined
          });
        }}
      />
    );
  }

  return (
    <SignInButton mode="modal">
      <Button 
        variant="ghost" 
        className="flex items-center gap-2"
        onClick={() => {
          // Track sign-in button click
          gaEvent({
            action: 'sign_in_button_click',
            category: 'authentication',
            label: 'header',
            value: undefined
          });
        }}
      >
        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-medium">Sign in</span>
      </Button>
    </SignInButton>
  );
} 