"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Create a Supabase client with the public URL and anonymous key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log Supabase configuration for debugging
console.log('Auth Context - Supabase URL available:', !!supabaseUrl);
console.log('Auth Context - Supabase Anon Key available:', !!supabaseAnonKey);

// Create a client-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false, // We're using Clerk, not Supabase Auth
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Define the shape of our auth context
type AuthContextType = {
  user: any;
  isLoaded: boolean;
  isSignedIn: boolean;
  supabaseUser: any;
  authError: string | null;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
  supabaseUser: null,
  authError: null,
});

// Custom hook to use the auth context
export const useAuthContext = () => useContext(AuthContext);
// Alias for backward compatibility
export const useAuth = useAuthContext;

// Provider component that wraps the app and makes auth object available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Get user and auth state from Clerk
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  // State to store the Supabase user and any auth errors
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);
  
  // Function to sync user data to Supabase
  const syncUserToSupabase = async () => {
    if (!user || !isSignedIn) {
      console.log('Auth Context - User is not signed in, skipping sync');
      return null;
    }
    
    try {
      console.log('Auth Context - User is signed in, syncing to Supabase');
      
      // Get user data from Clerk
      const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous User';
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      if (!email) {
        console.error('Auth Context - No email found for user');
        setAuthError('No email found for user');
        return null;
      }
      
      // Call our API to sync the user to Supabase
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          clerk_id: user.id,
        }),
      });
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Auth Context - Error syncing user to Supabase:', errorData);
        
        // If we get a 401, the user might not be authenticated
        if (response.status === 401) {
          console.log('Auth Context - Authentication required, using Clerk user data as fallback');
          setAuthError('Authentication required');
          return {
            id: user.id,
            name,
            email,
            clerk_id: user.id,
          };
        }
        
        // For other errors, still use Clerk data as fallback
        console.log('Auth Context - Using Clerk user data as fallback due to sync error');
        setAuthError(`Error syncing user: ${errorData.error || 'Unknown error'}`);
        return {
          id: user.id,
          name,
          email,
          clerk_id: user.id,
        };
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Auth Context - User synced to Supabase:', data.user);
      setAuthError(null);
      
      return data.user;
    } catch (error) {
      console.error('Auth Context - Error in syncUserToSupabase:', error);
      setAuthError(`Error syncing user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Use Clerk data as fallback
      console.log('Auth Context - Using Clerk user data as fallback due to exception');
      return {
        id: user.id,
        name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous User',
        email: user.primaryEmailAddress?.emailAddress || '',
        clerk_id: user.id,
      };
    }
  };
  
  // Effect to sync user data to Supabase when the user signs in
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user && !syncAttempted) {
        // Sync user data to Supabase
        setSyncAttempted(true);
        syncUserToSupabase().then((syncedUser) => {
          setSupabaseUser(syncedUser);
          if (syncedUser) {
            console.log('Auth Context - User synced successfully');
          } else {
            console.error('Auth Context - Failed to sync user');
            toast.error('Failed to sync user data');
          }
        });
      } else if (!isSignedIn) {
        // Clear Supabase user when signed out
        console.log('Auth Context - User is signed out, clearing Supabase user');
        setSupabaseUser(null);
        setSyncAttempted(false);
      }
    }
  }, [isLoaded, isSignedIn, user, syncAttempted]);
  
  // Effect to set up Supabase client with user ID for RLS
  useEffect(() => {
    const setupSupabaseAuth = async () => {
      if (isSignedIn && user) {
        try {
          // Get JWT token from Clerk
          const token = await getToken({ template: 'supabase' });
          
          if (token) {
            console.log('Auth Context - Setting Supabase auth with Clerk JWT');
            
            // Set custom auth header for Supabase
            supabase.auth.setSession({
              access_token: token as string,
              refresh_token: '',
            });
            
            // Also set a custom header with the user ID
            supabase.rest.headers.append('x-clerk-user-id', user.id);
            
            console.log('Auth Context - Supabase auth set successfully');
          } else {
            console.log('Auth Context - No token available from Clerk');
            setAuthError('No authentication token available');
          }
        } catch (error) {
          console.error('Auth Context - Error setting up Supabase auth:', error);
          setAuthError(`Error setting up authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (supabase) {
        // Clear session when signed out
        console.log('Auth Context - Clearing Supabase session');
        supabase.auth.signOut();
      }
    };
    
    setupSupabaseAuth();
  }, [isSignedIn, user, getToken]);
  
  // Provide the auth context to the app
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn,
        supabaseUser,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 