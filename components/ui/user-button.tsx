"use client";

import { UserButton as ClerkUserButton, SignInButton, useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserButton() {
  const { isSignedIn, user, isLoaded } = useUser();

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
      />
    );
  }

  return (
    <SignInButton mode="modal">
      <Button variant="ghost" className="flex items-center gap-2">
        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-medium">Sign in</span>
      </Button>
    </SignInButton>
  );
} 