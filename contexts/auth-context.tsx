"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

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
      console.error("No primary email found for user");
      return;
    }

    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Anonymous User';

    try {
      // First check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", clerkUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error("Error fetching user data:", fetchError);
        return;
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name,
            email
          })
          .eq("id", clerkUser.id);

        if (updateError) {
          console.error("Error updating user:", updateError);
          return;
        }
      } else {
        // Insert new user
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: clerkUser.id,
            name,
            email
          });

        if (insertError) {
          console.error("Error inserting user:", insertError);
          return;
        }
      }

      // Set the user in state
      setUser({
        id: clerkUser.id,
        name,
        email
      });
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
    }
  };

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      // Try to sync the user to Supabase
      syncUserToSupabase(clerkUser);
      
      // Also fetch user data from Supabase
      const fetchUserData = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", clerkUser.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }

        if (data) {
          setUser({
            id: data.id,
            name: data.name,
            email: data.email,
          });
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