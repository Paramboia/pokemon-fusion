const { createClient } = require('@supabase/supabase-js');
const { clerkClient } = require('@clerk/clerk-sdk-node');

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CLERK_SECRET_KEY) {
  console.error('❌ Missing required environment variables:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  console.log('   CLERK_SECRET_KEY:', CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getSupabaseUsersWithoutClerkId() {
  console.log('📋 Fetching Supabase users without clerk_id...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, clerk_id')
      .or('clerk_id.is.null,clerk_id.eq.""');
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    console.log(`📊 Found ${data?.length || 0} Supabase users without clerk_id`);
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching Supabase users:', error);
    return [];
  }
}

async function getAllClerkUsers() {
  console.log('👥 Fetching all users from production Clerk...');
  
  try {
    const users = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await clerkClient.users.getUserList({
        limit,
        offset,
      });
      
      if (!response || response.length === 0) {
        break;
      }
      
      users.push(...response);
      offset += limit;
      
      console.log(`   Fetched ${users.length} users so far...`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📊 Total production Clerk users found: ${users.length}`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching Clerk users:', error);
    return [];
  }
}

async function updateSupabaseUserWithClerkId(supabaseUserId, clerkId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ clerk_id: clerkId })
      .eq('id', supabaseUserId);
    
    if (error) {
      console.error(`❌ Error updating user ${supabaseUserId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating user ${supabaseUserId}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Clerk Production Migration...');
  console.log('📝 This script will match existing Supabase users with production Clerk users by email');
  console.log('');
  
  // Get data from both sources
  const [supabaseUsers, clerkUsers] = await Promise.all([
    getSupabaseUsersWithoutClerkId(),
    getAllClerkUsers()
  ]);
  
  if (supabaseUsers.length === 0) {
    console.log('✅ No Supabase users need migration - all users already have clerk_id');
    return;
  }
  
  if (clerkUsers.length === 0) {
    console.error('❌ No Clerk users found. Check your CLERK_SECRET_KEY and ensure it\'s for production.');
    return;
  }
  
  // Create email lookup map for Clerk users
  const clerkUsersByEmail = new Map();
  clerkUsers.forEach(user => {
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      // Get primary email or first email
      const primaryEmailObj = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      ) || user.emailAddresses[0];
      
      if (primaryEmailObj && primaryEmailObj.emailAddress) {
        clerkUsersByEmail.set(primaryEmailObj.emailAddress.toLowerCase(), user);
      }
    }
  });
  
  console.log(`📋 Created lookup map for ${clerkUsersByEmail.size} Clerk users`);
  console.log('');
  
  // Match users and update
  const usersToUpdate = [];
  const usersNotFound = [];
  
  supabaseUsers.forEach(supabaseUser => {
    if (!supabaseUser.email) {
      usersNotFound.push({ supabaseUser, reason: 'No email' });
      return;
    }
    
    const clerkUser = clerkUsersByEmail.get(supabaseUser.email.toLowerCase());
    if (clerkUser) {
      usersToUpdate.push({
        supabaseUser,
        clerkUser,
        email: supabaseUser.email
      });
    } else {
      usersNotFound.push({ supabaseUser, reason: 'No matching Clerk user' });
    }
  });
  
  console.log('📊 Migration Analysis:');
  console.log(`   ✅ Users to migrate: ${usersToUpdate.length}`);
  console.log(`   ❌ Users not found in Clerk: ${usersNotFound.length}`);
  console.log('');
  
  if (usersNotFound.length > 0) {
    console.log('⚠️  Users that could not be matched:');
    usersNotFound.forEach(({ supabaseUser, reason }) => {
      console.log(`   - ${supabaseUser.name} (${supabaseUser.email || 'no email'}): ${reason}`);
    });
    console.log('');
  }
  
  if (usersToUpdate.length === 0) {
    console.log('✅ No users need migration');
    return;
  }
  
  // Ask for confirmation
  console.log('🔄 Starting migration...');
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const { supabaseUser, clerkUser, email } of usersToUpdate) {
    console.log(`🔗 Linking ${supabaseUser.name} (${email}) to Clerk ID ${clerkUser.id.substring(0, 8)}...`);
    
    const success = await updateSupabaseUserWithClerkId(supabaseUser.id, clerkUser.id);
    
    if (success) {
      successCount++;
      console.log(`   ✅ Success`);
    } else {
      errorCount++;
      console.log(`   ❌ Failed`);
    }
    
    // Add a small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('');
  console.log('📊 Migration Complete:');
  console.log(`   ✅ Successfully migrated: ${successCount} users`);
  console.log(`   ❌ Failed: ${errorCount} users`);
  console.log(`   ⚠️  Not found in Clerk: ${usersNotFound.length} users`);
  
  if (successCount > 0) {
    console.log('');
    console.log('🎉 Migration successful! Your existing users are now linked to production Clerk.');
  }
  
  if (usersNotFound.length > 0) {
    console.log('');
    console.log('📝 Next Steps for unmatched users:');
    console.log('   1. These users will need to sign up again with production Clerk');
    console.log('   2. When they sign up with the same email, they will automatically be linked');
    console.log('   3. Their existing data (favorites, credits, etc.) will be preserved');
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}); 