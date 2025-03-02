'use client';

import { useAuthContext } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { SignInButton, SignOutButton } from '@clerk/nextjs';

export default function DebugPage() {
  const { user, isLoaded, isSignedIn, supabaseUser, authError } = useAuthContext();
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  
  const testSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    try {
      const response = await fetch('/api/test-supabase-simple');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsTestingSupabase(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Page</h1>
      
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">isLoaded:</div>
          <div>{isLoaded ? 'Yes' : 'No'}</div>
          
          <div className="font-medium">isSignedIn:</div>
          <div>{isSignedIn ? 'Yes' : 'No'}</div>
          
          <div className="font-medium">Auth Error:</div>
          <div className="text-red-500">{authError || 'None'}</div>
        </div>
        
        <div className="mt-4">
          {!isSignedIn ? (
            <SignInButton>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Sign In
              </button>
            </SignInButton>
          ) : (
            <SignOutButton>
              <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                Sign Out
              </button>
            </SignOutButton>
          )}
        </div>
      </div>
      
      {isSignedIn && user && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Clerk User</h2>
          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify({
              id: user.id,
              fullName: user.fullName,
              firstName: user.firstName,
              lastName: user.lastName,
              primaryEmail: user.primaryEmailAddress?.emailAddress,
              imageUrl: user.imageUrl,
            }, null, 2)}
          </pre>
        </div>
      )}
      
      {isSignedIn && supabaseUser && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Supabase User</h2>
          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(supabaseUser, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Test Supabase Connection</h2>
        <button 
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mb-4"
          onClick={testSupabaseConnection}
          disabled={isTestingSupabase}
        >
          {isTestingSupabase ? 'Testing...' : 'Test Connection'}
        </button>
        
        {testResult && (
          <div className="mt-2">
            <h3 className="font-medium mb-1">Test Result:</h3>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-500 mt-8">
        <p>This page is for debugging authentication issues. It shows the current authentication state and allows you to test the Supabase connection.</p>
      </div>
    </div>
  );
} 