"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase-client";

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
    if (!clerkUser) return;

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) {
      console.warn("No primary email found for user");
      return;
    }

    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Anonymous User';

    // Generate a UUID v4 for Supabase instead of using Clerk's ID directly
    // This resolves the "invalid input syntax for type uuid" error
    const userId = crypto.randomUUID();
    
    console.log("Syncing user to Supabase with generated UUID:", userId);

    try {
      // First check if user exists - using email as the identifier instead of ID
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      // Handle the case where the user doesn't exist yet (PGRST116 is "no rows returned" error)
      // This is an expected error when a user signs in for the first time
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Only log actual errors, not the "no rows returned" which is expected for new users
        console.warn("Warning fetching user data:", fetchError.message || "Unknown error");
        // Continue execution to create the user
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name,
            email
          })
          .eq("id", existingUser.id);

        if (updateError) {
          console.warn("Warning updating user:", updateError.message || "Unknown error");
          // Still set the user with the data we have
        } else {
          console.log("Successfully updated user in Supabase");
        }
        
        // Use the existing ID from the database
        setUser({
          id: existingUser.id,
          name,
          email
        });
      } else {
        // Insert new user with the generated UUID
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            name,
            email,
            clerk_id: clerkUser.id // Store the original Clerk ID as a reference
          });

        if (insertError) {
          console.warn("Warning inserting user:", insertError.message || "Unknown error");
          // Continue with what we have
        } else {
          console.log("Successfully inserted new user in Supabase");
        }
        
        // Set the user with the new UUID
        setUser({
          id: userId,
          name,
          email
        });
      }
    } catch (error) {
      console.warn("Warning syncing user to Supabase:", error instanceof Error ? error.message : "Unknown error");
      // Still set the user with the data we have from Clerk
      setUser({
        id: clerkUser.id, // Fallback to Clerk ID
        name,
        email
      });
    }
  };

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      // Try to sync the user to Supabase
      syncUserToSupabase(clerkUser);
      
      // Also fetch user data from Supabase - using email as identifier
      const fetchUserData = async () => {
        try {
          const email = clerkUser.primaryEmailAddress?.emailAddress;
          if (!email) {
            console.warn("No primary email found for user");
            return;
          }
          
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

          // Handle the case where the user doesn't exist yet
          if (error) {
            if (error.code === 'PGRST116') {
              // This is expected for new users, not an actual error
              // The syncUserToSupabase function will create the user
              return;
            }
            console.warn("Warning fetching user data:", error.message || "Unknown error");
            return;
          }

          if (data) {
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
            });
          }
        } catch (error) {
          console.warn("Warning in fetchUserData:", error instanceof Error ? error.message : "Unknown error");
          // Use Clerk data as fallback
          const email = clerkUser.primaryEmailAddress?.emailAddress;
          const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Anonymous User';
          
          if (email) {
            setUser({
              id: clerkUser.id,
              name,
              email
            });
          }
        }
      };

      fetchUserData();
    } else {
      setUser(null);
    }
  }, [isSignedIn, clerkUser]);

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