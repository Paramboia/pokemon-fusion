// Simple script to test if Supabase project is active
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const dns = require('dns');
const { promisify } = require('util');
const dnsLookup = promisify(dns.lookup);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment variables:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || 'Not found'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Found (not showing for security)' : 'Not found'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Found (not showing for security)' : 'Not found'}`);

// Extract hostname from URL
function getHostname(url) {
  try {
    if (!url) return null;
    return new URL(url).hostname;
  } catch (e) {
    console.log(`Invalid URL: ${url}`);
    return null;
  }
}

async function checkDns() {
  const hostname = getHostname(supabaseUrl);
  if (!hostname) {
    console.log('Could not extract hostname from Supabase URL');
    return false;
  }
  
  console.log(`\nChecking DNS resolution for ${hostname}...`);
  try {
    const result = await dnsLookup(hostname);
    console.log(`DNS resolution successful: ${hostname} resolves to ${result.address}`);
    return true;
  } catch (error) {
    console.log(`DNS resolution failed for ${hostname}: ${error.message}`);
    console.log('This suggests the domain does not exist or there might be network issues.');
    return false;
  }
}

async function checkSupabaseStatus() {
  if (!supabaseUrl) {
    console.log('\nSUPABASE_URL is not defined in your .env.local file');
    return false;
  }
  
  if (!supabaseAnonKey) {
    console.log('\nSUPABASE_ANON_KEY is not defined in your .env.local file');
    return false;
  }
  
  // Check if DNS resolves
  const dnsWorks = await checkDns();
  if (!dnsWorks) {
    console.log('\nDNS resolution failed. The Supabase domain might be incorrect.');
    
    // Try alternative URL formats
    console.log('\nTrying alternative URL formats:');
    const hostname = getHostname(supabaseUrl);
    if (hostname) {
      const alternativeUrls = [
        `https://${hostname}`,
        `http://${hostname}`,
        `https://${hostname.replace('-', '.')}`
      ];
      
      for (const url of alternativeUrls) {
        console.log(`Testing: ${url}`);
        try {
          const response = await axios.get(`${url}/rest/v1/`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            timeout: 5000
          });
          console.log(`Success with ${url}! Status: ${response.status}`);
          console.log(`Consider updating your SUPABASE_URL to: ${url}`);
          return true;
        } catch (error) {
          if (error.response) {
            console.log(`Got response from ${url} with status: ${error.response.status}`);
          } else {
            console.log(`Failed to connect to ${url}: ${error.message}`);
          }
        }
      }
    }
    
    return false;
  }
  
  try {
    console.log('\nTesting Supabase health endpoint...');
    const healthResponse = await axios.get(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Supabase health check successful!');
    console.log(`Status: ${healthResponse.status}`);
    console.log('Response data:', healthResponse.data);
    return true;
  } catch (error) {
    console.log('\nError connecting to Supabase:');
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      console.log(`Connection error (${error.code}): The Supabase project might be paused or the URL is incorrect.`);
      console.log(`Attempted URL: ${supabaseUrl}`);
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`Status: ${error.response.status}`);
      console.log('Response headers:', error.response.headers);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received. This might indicate that the Supabase project is paused.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error message:', error.message);
    }
    
    return false;
  }
}

async function testSupabaseQuery() {
  if (!await checkSupabaseStatus()) {
    console.log('\nSkipping database query test due to failed health check.');
    return;
  }
  
  try {
    console.log('\nTesting Supabase query...');
    const queryResponse = await axios.get(`${supabaseUrl}/rest/v1/users?select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    console.log('Query successful!');
    console.log(`Found ${queryResponse.data.length} users`);
    console.log('First few users (if any):', queryResponse.data.slice(0, 3));
  } catch (error) {
    console.log('\nError querying Supabase:');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response data:', error.response.data);
    } else {
      console.log('Error message:', error.message);
    }
  }
}

// Run tests
(async () => {
  await checkSupabaseStatus();
  await testSupabaseQuery();
})(); 