"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

// Define the shape of our auth context
type AuthContextType = {
  user: any;
  isLoaded: boolean;
  isSignedIn: boolean;
  supabaseUser: any;
  authError: string | null;
  syncUserToSupabase: () => Promise<any>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
  supabaseUser: null,
  authError: null,
  syncUserToSupabase: async () => null,
});

// Custom hook to use the auth context
export const useAuthContext = () => useContext(AuthContext);
// Alias for backward compatibility
export const useAuth = useAuthContext;

// Provider component that wraps the app and makes auth object available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Get user and auth state from Clerk
  const { user, isLoaded, isSignedIn } = useUser();
  
  // State to store the Supabase user and any auth errors
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // Function to sync user data to Supabase
  const syncUserToSupabase = async () => {
    if (!user || !isSignedIn) {
      console.log('Auth Context - User is not signed in, skipping sync');
      return null;
    }
    
    if (syncInProgress) {
      console.log('Auth Context - Sync already in progress, skipping');
      return supabaseUser;
    }
    
    setSyncInProgress(true);
    
    // Get user data from Clerk (move outside try block for scope)
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Anonymous User';
    const email = user.primaryEmailAddress?.emailAddress;
    
    // Handle missing email (common with X/Twitter OAuth)
    let fallbackEmail = email;
    if (!email) {
      console.log('Auth Context - No email found for user, using fallback strategy');
      const fallbackIdentifier = user.username || user.id;
      fallbackEmail = `${fallbackIdentifier}@clerk-fallback.local`;
    }
    
    try {
      console.log('Auth Context - User is signed in, syncing to Supabase');
      console.log('Auth Context - User details:', {
        id: user.id,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        hasEmail: !!user.primaryEmailAddress
      });
      
      console.log('Auth Context - Calling sync-user API with name:', name, 'email:', email || 'fallback', 'hasRealEmail:', !!email);
      
              // Call our API to sync the user to Supabase
        const response = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.username,
            emailAddresses: [
              { emailAddress: fallbackEmail }
            ],
            hasRealEmail: !!email
          }),
        });
      
      console.log('Auth Context - sync-user API response status:', response.status);
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Auth Context - Error syncing user to Supabase:', errorData);
        console.error('Auth Context - Response status:', response.status);
        
        // For errors, use Clerk data as fallback
        console.log('Auth Context - Using Clerk user data as fallback due to sync error');
        setAuthError(`Error syncing user: ${errorData.error || 'Unknown error'}`);
        
        const fallbackUser = {
          id: user.id,
          name,
          email: fallbackEmail,
        };
        
        setSupabaseUser(fallbackUser);
        setSyncInProgress(false);
        return fallbackUser;
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Auth Context - User synced to Supabase:', data.user);
      setAuthError(null);
      
      setSupabaseUser(data.user);
      setSyncInProgress(false);
      return data.user;
    } catch (error) {
      console.error('Auth Context - Error in syncUserToSupabase:', error);
      console.error('Auth Context - Error details:', error instanceof Error ? error.message : 'Unknown error');
      setAuthError(`Error syncing user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Use Clerk data as fallback
      console.log('Auth Context - Using Clerk user data as fallback due to exception');
      const fallbackUser = {
        id: user.id,
        name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Anonymous User',
        email: fallbackEmail,
      };
      
      setSupabaseUser(fallbackUser);
      setSyncInProgress(false);
      return fallbackUser;
    }
  };

  // Effect to sync user data to Supabase when the user signs in
  useEffect(() => {
    console.log('Auth Context - useEffect triggered with isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'syncAttempted:', syncAttempted);

    if (isLoaded) {
      if (isSignedIn && user && !syncAttempted) {
        console.log('Auth Context - User is signed in, attempting to sync. User:', user.id);
        // Sync user data to Supabase
        setSyncAttempted(true);
        syncUserToSupabase().then((syncedUser) => {
          console.log('Auth Context - syncUserToSupabase completed, result:', syncedUser);
          if (syncedUser) {
            console.log('Auth Context - User synced successfully');
          } else {
            console.error('Auth Context - Failed to sync user');
            toast.error('Failed to sync user data');
          }
        }).catch(error => {
          console.error('Auth Context - Exception in syncUserToSupabase promise:', error);
          console.error('Auth Context - Error stack:', error.stack);
          toast.error('Error syncing user data');
        });
      } else if (!isSignedIn) {
        // Clear Supabase user when signed out
        console.log('Auth Context - User is signed out, clearing Supabase user');
        setSupabaseUser(null);
        setSyncAttempted(false);
        setAuthError(null);
      }
    }
  }, [isLoaded, isSignedIn, user, syncAttempted]);

  // Provide the auth context to the app
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn,
        supabaseUser,
        authError,
        syncUserToSupabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 