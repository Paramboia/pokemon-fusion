// Quick test of the notification route
const quickTestPayload = {
  record: {
    id: 'quick-test-' + Date.now(),
    user_id: '6f579f9b-090d-46f0-ba1d-b485c33073a5', // Your OneSignal External ID
    pokemon1_name: 'Rayquaza',
    pokemon2_name: 'Dragonite',
    created_at: new Date().toISOString()
  }
};

async function quickTest() {
  console.log('⚡ Quick notification test...');
  
  try {
    const response = await fetch('https://www.pokemon-fusion.com/api/notifications/fusion-created', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer quick-test-token',
        'x-supabase-webhook-secret': 'fusion-webhook-secret-2024'
      },
      body: JSON.stringify(quickTestPayload)
    });

    const result = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (response.ok && result.success && result.data?.notification?.id) {
      console.log('\n✅ SUCCESS!');
      console.log('🔔 Notification ID:', result.data.notification.id);
      console.log('📱 Check for: "Your Rayquaza-Dragonite is waiting for you."');
    } else {
      console.log('\n❌ Issue detected');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

quickTest(); 