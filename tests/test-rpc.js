const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://lfbmvtxvqjbwxpzwxnwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYm12dHh2cWpid3hwend4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NTc1NzcsImV4cCI6MjAyNTEzMzU3N30.Nh83ebqzf1iGHTaGywss6WIkkNlSiB3XjMgCgr8o4Ww';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test fusion ID - replace with an actual fusion ID from your database
const fusionId = 'd57dfd08-7174-4698-8598-b2e9dba6d36f';

async function testRpcFunction() {
  console.log('Testing increment_fusion_likes RPC function...');
  console.log('Using fusion ID:', fusionId);

  // Get current likes count
  const { data: initialData, error: initialError } = await supabase
    .from('fusions')
    .select('likes')
    .eq('id', fusionId)
    .single();

  if (initialError) {
    console.error('Error getting initial likes count:', initialError);
    return;
  }

  console.log('Current likes count:', initialData.likes);

  // Call the RPC function
  const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_fusion_likes', {
    fusion_id: fusionId
  });

  console.log('RPC function result:', rpcResult);

  if (rpcError) {
    console.error('Error calling RPC function:', rpcError);
    return;
  }

  // Get updated likes count
  const { data: updatedData, error: updatedError } = await supabase
    .from('fusions')
    .select('likes')
    .eq('id', fusionId)
    .single();

  if (updatedError) {
    console.error('Error getting updated likes count:', updatedError);
    return;
  }

  console.log('Updated likes count:', updatedData.likes);
  console.log('Likes increased by:', updatedData.likes - initialData.likes);
}

testRpcFunction(); 