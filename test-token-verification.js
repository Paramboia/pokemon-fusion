// test-token-verification.js
const { clerkClient } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

async function testTokenVerification() {
  try {
    // Replace with a valid token from your browser's console
    // You can get this by running `await getToken()` in the browser console after importing from Clerk
    const token = process.argv[2];
    
    if (!token) {
      console.error('Please provide a token as a command line argument');
      console.error('Usage: node test-token-verification.js YOUR_TOKEN');
      process.exit(1);
    }
    
    console.log('Testing token verification with Clerk');
    console.log('Token (first 10 chars):', token.substring(0, 10) + '...');
    
    // Verify the token
    const verifiedToken = await clerkClient.verifyToken(token);
    
    console.log('Token verification successful!');
    console.log('Verified token:', verifiedToken);
    
    if (verifiedToken && verifiedToken.sub) {
      console.log('User ID (sub):', verifiedToken.sub);
      
      // Get user details
      const user = await clerkClient.users.getUser(verifiedToken.sub);
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (user) {
        console.log('User details:');
        console.log('- ID:', user.id);
        console.log('- First name:', user.firstName);
        console.log('- Last name:', user.lastName);
        console.log('- Email addresses:', user.emailAddresses.map(e => e.emailAddress));
      }
    }
  } catch (error) {
    console.error('Error verifying token:', error);
  }
}

testTokenVerification(); 