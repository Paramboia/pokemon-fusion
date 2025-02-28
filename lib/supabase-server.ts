import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to get the current user ID from Clerk
export const getCurrentUserId = async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId;
}; 