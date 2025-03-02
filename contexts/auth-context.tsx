"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase, setupSupabaseWithUser } from "@/lib/supabase-client";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<User | null>(null);

  // Function to manually sync user to Supabase
  const syncUserToSupabase = async (clerkUser: any) => {
    if (!clerkUser) {
      console.log("Auth Context - No Clerk user to sync");
      return;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) {
      console.warn("Auth Context - No primary email found for user");
      return;
    }

    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Anonymous User';
    
    console.log("Auth Context - Syncing user to Supabase with name:", name, "and email:", email);

    try {
      // Call the API endpoint to sync the user with Supabase using the service role key
      console.log("Auth Context - Calling sync-user API endpoint");
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email
        }),
      });
      
      console.log("Auth Context - Sync-user API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn("Auth Context - Error syncing user to Supabase:", errorData.error);
        
        // Still set the user with the data we have from Clerk as a fallback
        setUser({
          id: clerkUser.id, // Fallback to Clerk ID
          name,
          email
        });
        console.log("Auth Context - Using Clerk user data as fallback:", clerkUser.id);
        return;
      }
      
      const data = await response.json();
      console.log("Auth Context - Sync-user API response data:", data);
      
      if (data.success && data.user) {
        // Set the user with the data from Supabase
        const userData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email
        };
        setUser(userData);
        console.log("Auth Context - Successfully synced user to Supabase with ID:", data.user.id);
        
        // Set up Supabase with the user ID
        await setupSupabaseWithUser(data.user.id);
      } else {
        // Fallback to Clerk data
        const userData = {
          id: clerkUser.id,
          name,
          email
        };
        setUser(userData);
        console.log("Auth Context - Using Clerk user data as fallback (no user data in response):", clerkUser.id);
        
        // Set up Supabase with the Clerk user ID
        await setupSupabaseWithUser(clerkUser.id);
      }
    } catch (error) {
      console.warn("Auth Context - Warning syncing user to Supabase:", error instanceof Error ? error.message : "Unknown error");
      console.error("Auth Context - Error details:", error);
      // Still set the user with the data we have from Clerk
      const userData = {
        id: clerkUser.id, // Fallback to Clerk ID
        name,
        email
      };
      setUser(userData);
      console.log("Auth Context - Using Clerk user data as fallback (error):", clerkUser.id);
      
      // Set up Supabase with the Clerk user ID
      await setupSupabaseWithUser(clerkUser.id);
    }
  };

  // Effect to sync user data from Clerk to Supabase and set up RLS
  useEffect(() => {
    console.log("Auth Context - Auth state changed:", { isLoaded, isSignedIn });
    if (isLoaded && isSignedIn && clerkUser) {
      console.log("Auth Context - User is signed in, syncing to Supabase");
      syncUserToSupabase(clerkUser);
    } else if (isLoaded && !isSignedIn) {
      // Clear user data when signed out
      console.log("Auth Context - User is signed out, clearing user data");
      setUser(null);
      
      // Clear Supabase session when signed out
      supabase.auth.signOut();
      console.log("Auth Context - Cleared Supabase session");
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoaded: isLoaded ?? false, 
      isSignedIn: isSignedIn ?? false 
    }}>
      {children}
    </AuthContext.Provider>
  );
} 