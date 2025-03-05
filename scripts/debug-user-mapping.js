/**
 * Debug script to check and fix user mapping between Clerk and Supabase
 * 
 * This script:
 * 1. Checks if a Clerk user exists in Supabase
 * 2. If not, creates the user in Supabase
 * 3. If the user exists but clerk_id is missing, updates it
 * 
 * Usage:
 * node scripts/debug-user-mapping.js <clerk_user_id>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  try {
    // Get Clerk user ID from command line arguments
    const clerkUserId = process.argv[2];
    if (!clerkUserId) {
      console.error('Please provide a Clerk user ID as an argument');
      console.error('Usage: node scripts/debug-user-mapping.js <clerk_user_id>');
      process.exit(1);
    }

    console.log('Debugging user mapping for Clerk user ID:', clerkUserId);

    // Check if user exists in Supabase by clerk_id
    console.log('\nChecking if user exists in Supabase by clerk_id...');
    const { data: userByClerkId, error: clerkIdError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .maybeSingle();

    if (clerkIdError) {
      console.error('Error querying Supabase:', clerkIdError);
      process.exit(1);
    }

    if (userByClerkId) {
      console.log('✅ User found in Supabase by clerk_id:');
      console.log(userByClerkId);
      
      // Check if credits_balance exists and is a number
      if (typeof userByClerkId.credits_balance !== 'number') {
        console.log('\nUpdating user with default credits_balance...');
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ credits_balance: 0 })
          .eq('id', userByClerkId.id)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating user:', updateError);
        } else {
          console.log('✅ User updated with default credits_balance');
          console.log(updatedUser);
        }
      }
      
      process.exit(0);
    }

    // If user not found by clerk_id, prompt for email to check
    console.log('❌ User not found in Supabase by clerk_id');
    
    // For simplicity in this script, we'll just ask for the email
    const email = process.argv[3];
    if (!email) {
      console.error('\nPlease provide an email address as a second argument');
      console.error('Usage: node scripts/debug-user-mapping.js <clerk_user_id> <email>');
      process.exit(1);
    }
    
    console.log(`\nChecking if user exists in Supabase by email: ${email}...`);
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (emailError) {
      console.error('Error querying Supabase:', emailError);
      process.exit(1);
    }
    
    if (userByEmail) {
      console.log('✅ User found in Supabase by email:');
      console.log(userByEmail);
      
      console.log('\nUpdating user with clerk_id...');
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ clerk_id: clerkUserId })
        .eq('id', userByEmail.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating user:', updateError);
        process.exit(1);
      }
      
      console.log('✅ User updated with clerk_id:');
      console.log(updatedUser);
      process.exit(0);
    }
    
    // If user not found by email either, create a new user
    console.log('❌ User not found in Supabase by email');
    console.log('\nCreating new user in Supabase...');
    
    // For simplicity, we'll use a default name
    const name = process.argv[4] || 'New User';
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkUserId,
        email,
        name,
        credits_balance: 0
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    
    console.log('✅ New user created in Supabase:');
    console.log(newUser);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 