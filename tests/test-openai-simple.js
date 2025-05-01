require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

console.log('===== SIMPLE OPENAI API TEST =====');
console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
console.log('API Key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'missing');
console.log('API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

// Initialize OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120000,
    maxRetries: 1
  });
  console.log('OpenAI client initialized successfully');
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
  process.exit(1);
}

// Test the OpenAI API
async function runTest() {
  try {
    // First try a simpler text API call
    console.log('\nTesting simple text generation...');
    const textResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say hello!"
        }
      ],
      max_tokens: 10
    });
    
    console.log('Text generation succeeded!');
    console.log('Response content:', textResponse.choices[0]?.message?.content);
    
    console.log('\nTesting simple models.list() API call...');
    if (typeof openai.models?.list === 'function') {
      const models = await openai.models.list();
      console.log('Models list call succeeded!');
      console.log(`Found ${models.data.length} models`);
      
      // Find DALL-E and gpt-image-1 models
      const dalleModels = models.data.filter(model => model.id.includes('dall-e') || model.id.includes('gpt-image'));
      console.log('DALL-E/Image models available:', dalleModels.map(m => m.id).join(', '));
    } else {
      console.log('models.list is not a function, skipping this test');
    }
    
    console.log('\nTesting basic image generation...');
    // Test image generation with very basic parameters
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: 'A simple cartoon blue dog wearing a red t-shirt',
      n: 1,
      size: '1024x1024',
      quality: 'high' // Must be 'high', 'medium', 'low', or 'auto'
    });
    
    console.log('Image generation succeeded!');
    console.log('Response structure:', {
      hasData: !!response.data,
      dataLength: response.data?.length || 0,
      firstItemKeys: response.data?.[0] ? Object.keys(response.data[0]) : []
    });
    
    if (response.data?.[0]?.b64_json) {
      const b64Length = response.data[0].b64_json.length;
      console.log(`Received base64 data of length: ${b64Length}`);
      console.log('First 50 chars:', response.data[0].b64_json.substring(0, 50) + '...');
    } else if (response.data?.[0]?.url) {
      console.log('Received URL:', response.data[0].url);
    } else {
      console.log('No image data in response');
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during API test:', error);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

// Run the test
runTest(); 