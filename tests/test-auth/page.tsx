"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

export default function TestAuthPage() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  const { user } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseInfo, setSupabaseInfo] = useState<any>({});

  // Create a Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  useEffect(() => {
    // Check Supabase configuration
    setSupabaseInfo({
      url: supabaseUrl ? 'Set' : 'Not set',
      anonKey: supabaseAnonKey ? 'Set' : 'Not set',
      fullUrl: supabaseUrl,
    });
  }, [supabaseUrl, supabaseAnonKey]);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    async function checkSupabaseUser() {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get the user's email
        const email = user.primaryEmailAddress?.emailAddress;
        
        if (!email) {
          setError('No email found for user');
          setLoading(false);
          return;
        }
        
        console.log('Checking Supabase for user with email:', email);
        
        // Check if the users table exists first
        try {
          const { data: tableData, error: tableError } = await supabase
            .from('users')
            .select('count(*)', { count: 'exact', head: true });
            
          if (tableError) {
            console.error('Error checking users table:', tableError);
            setError(`Error checking users table: ${tableError.message}`);
            setLoading(false);
            return;
          }
          
          console.log('Users table exists, count result:', tableData);
        } catch (tableErr) {
          console.error('Exception checking users table:', tableErr);
          setError(`Exception checking users table: ${tableErr instanceof Error ? tableErr.message : String(tableErr)}`);
          setLoading(false);
          return;
        }
        
        // Check if the user exists in Supabase
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);
            
          console.log('Query result:', { data, error });
          
          if (error) {
            console.error('Error fetching user from Supabase:', error);
            setError(`Error fetching user: ${error.message}`);
            setLoading(false);
            return;
          }
          
          if (data && data.length > 0) {
            setSupabaseUser(data[0]);
          } else {
            console.log('No user found with email:', email);
          }
          
          setLoading(false);
        } catch (queryErr) {
          console.error('Exception during Supabase query:', queryErr);
          setError(`Exception during query: ${queryErr instanceof Error ? queryErr.message : String(queryErr)}`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }
    
    checkSupabaseUser();
  }, [isLoaded, user, supabase]);

  // Manually trigger sync
  const syncUser = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user data from Clerk
      const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous User';
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      if (!email) {
        setError('No email found for user');
        setLoading(false);
        return;
      }
      
      console.log('Syncing user to Supabase:', {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email
      });
      
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
          emailAddresses: [
            { emailAddress: email }
          ]
        }),
      });
      
      console.log('Sync response status:', response.status);
      const responseText = await response.text();
      console.log('Sync response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        setError(`Error parsing response: ${responseText}`);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        setError(`Error syncing user: ${result.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      setSupabaseUser(result.user);
      setError(null);
      setLoading(false);
      
      // Refresh the page after successful sync
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Error syncing user:', err);
      setError(`Error syncing user: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Clerk Auth Status</h2>
        <p>Is Loaded: {isLoaded ? 'Yes' : 'No'}</p>
        <p>User ID: {userId || 'Not signed in'}</p>
        <p>Session ID: {sessionId || 'No session'}</p>
        {user && (
          <div className="mt-2">
            <p>Name: {user.fullName}</p>
            <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Supabase Configuration</h2>
        <p>Supabase URL: {supabaseInfo.url}</p>
        <p>Supabase Anon Key: {supabaseInfo.anonKey}</p>
        {supabaseInfo.url === 'Not set' && (
          <p className="text-red-500">
            Missing Supabase URL in environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL is set.
          </p>
        )}
        {supabaseInfo.anonKey === 'Not set' && (
          <p className="text-red-500">
            Missing Supabase Anon Key in environment variables. Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set.
          </p>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Supabase User Status</h2>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : supabaseUser ? (
          <div>
            <p>ID: {supabaseUser.id}</p>
            <p>Name: {supabaseUser.name}</p>
            <p>Email: {supabaseUser.email}</p>
            <p>Created At: {supabaseUser.created_at}</p>
          </div>
        ) : (
          <p>No user found in Supabase</p>
        )}
      </div>
      
      <div className="mt-4">
        <button
          onClick={syncUser}
          disabled={loading || !user}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {loading ? 'Syncing...' : 'Manually Sync User'}
        </button>
      </div>
    </div>
  );
} 