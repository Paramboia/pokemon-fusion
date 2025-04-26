/**
 * Script to test OpenAI API access
 * This will check if your OpenAI key is valid and can be used for image generation
 * 
 * First set your OpenAI API key with:
 * set OPENAI_API_KEY=your_key_here
 */
const OpenAI = require('openai');

console.log('Testing OpenAI API access...');

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
  console.log('❌ ERROR: OPENAI_API_KEY environment variable is not set.');
  console.log('Set it before running this script:');
  console.log('  set OPENAI_API_KEY=your_key_here  (on Windows)');
  console.log('  export OPENAI_API_KEY=your_key_here  (on Linux/Mac)');
  process.exit(1);
}

// Initialize OpenAI client
console.log(`API Key format check: ${process.env.OPENAI_API_KEY.startsWith('sk-') ? 'Valid prefix' : 'Invalid prefix - should start with sk-'}`);
console.log(`API Key length: ${process.env.OPENAI_API_KEY.length} characters`);

// Function to validate key with a simple completion request
async function testOpenAI() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Testing simple completion request...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello world" }
      ],
      max_tokens: 10
    });

    console.log('✅ API connection successful!');
    console.log('Response:', completion.choices[0].message.content);
    
    // Test image availability
    console.log('\nChecking for image generation capabilities...');
    const models = await openai.models.list();
    
    const imageModels = models.data.filter(model => 
      model.id.includes('image') || model.id.includes('dall-e')
    );
    
    if (imageModels.length > 0) {
      console.log('✅ Image generation models available:');
      imageModels.forEach(model => {
        console.log(`- ${model.id}`);
      });
      
      // Try a simple test image (this won't actually run to avoid charges)
      console.log('\nImage generation test completed without actually generating an image.');
      console.log('To test image generation, add this code:');
      console.log(`
  const image = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "A test image of a cartoon Pokémon",
    n: 1,
    size: "1024x1024"
  });
  console.log('Image URL:', image.data[0].url);
      `);
    } else {
      console.log('❌ No image generation models found in your account.');
    }
    
    console.log('\nOpenAI API test completed successfully!');
    
  } catch (error) {
    console.log('❌ Error testing OpenAI API:');
    console.log('Error Type:', error.constructor.name);
    
    if (error.response) {
      // API error
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data.error);
    } else {
      // Network or other error
      console.log('Error:', error.message);
    }
  }
}

// Run the test
testOpenAI(); 