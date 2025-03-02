// Script to check Supabase tables and RLS policies
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvVars() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if present
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env.local file:', error);
    return {};
  }
}

const envVars = loadEnvVars();

// Create a Supabase client with environment variables
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create a server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  try {
    console.log('Checking Supabase tables...');
    
    // First, try to query the users table directly
    console.log('\nChecking users table...');
    const { data: usersTable, error: usersTableError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersTableError) {
      console.error('Error fetching users table:', usersTableError);
    } else {
      console.log('Users table exists with columns:', usersTable.length > 0 ? Object.keys(usersTable[0]) : 'No users found');
      console.log('Sample users:', JSON.stringify(usersTable, null, 2));
    }
    
    // Try to list all tables
    console.log('\nListing all tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log('Tables in public schema:', tables.map(t => t.table_name));
      
      // Check each table for RLS
      console.log('\nChecking RLS for each table...');
      for (const table of tables) {
        const tableName = table.table_name;
        const { data: rlsData, error: rlsError } = await supabase
          .rpc('check_table_rls', { table_name: tableName });
        
        if (rlsError) {
          console.log(`Could not check RLS for table ${tableName}:`, rlsError);
        } else {
          console.log(`Table ${tableName} RLS:`, rlsData);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in script:', error);
  }
}

main(); 