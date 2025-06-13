async function syncUsers() {
  const secret = process.env.CRON_SECRET;
  
  if (!secret) {
    console.error('❌ CRON_SECRET environment variable not set');
    process.exit(1);
  }
  
  console.log('🔄 Syncing users from Supabase to OneSignal...');
  console.log('Using secret from environment variable');
  
  try {
    const response = await fetch('https://www.pokemon-fusion.com/api/notifications/sync-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret })
    });

    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Sync completed successfully!');
    } else {
      console.log('❌ Sync failed:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

syncUsers(); 