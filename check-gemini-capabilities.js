require('dotenv').config({ path: './.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in environment variables");
  process.exit(1);
}

console.log("✅ GEMINI_API_KEY found in environment variables");

// Initialize the Generative AI API
const genAI = new GoogleGenerativeAI(apiKey);

async function checkGeminiCapabilities() {
  console.log("🔍 Checking Gemini API capabilities with your API key...");
  
  // Try to access different Gemini models
  const models = [
    "gemini-1.0-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp-image-generation"
  ];
  
  for (const modelName of models) {
    try {
      console.log(`\n📌 Testing model: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Try a simple text prompt
      console.log(`   Sending a simple test prompt to ${modelName}...`);
      
      const result = await model.generateContent(
        "Hello! Can you tell me what capabilities you have with this model?"
      );
      
      const response = await result.response;
      const text = response.text();
      
      console.log(`   ✅ ${modelName} response received:`);
      console.log(`   Response: ${text.substring(0, 150)}...`);
      
      // Check if the model supports image generation
      if (modelName.includes("image-generation")) {
        console.log(`   Testing image generation capabilities of ${modelName}...`);
        try {
          const imageResult = await model.generateContent(
            "Generate a simple circle on a white background."
          );
          const imageResponse = await imageResult.response;
          
          // Check if there's any image data in the response
          if (imageResponse.candidates && 
              imageResponse.candidates[0] && 
              imageResponse.candidates[0].content && 
              imageResponse.candidates[0].content.parts) {
            
            const parts = imageResponse.candidates[0].content.parts;
            let hasImageData = false;
            
            for (const part of parts) {
              if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                hasImageData = true;
                console.log(`   ✅ ${modelName} successfully generated an image!`);
                break;
              }
            }
            
            if (!hasImageData) {
              console.log(`   ❌ ${modelName} did not generate an image, but returned text instead.`);
              console.log(`   This suggests you might not have access to image generation features with your API key.`);
            }
          }
        } catch (imageError) {
          console.error(`   ❌ Error testing image generation: ${imageError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error with model ${modelName}: ${error.message}`);
      
      if (error.message.includes("not found") || error.message.includes("doesn't exist")) {
        console.error(`   This model might not be available or you might not have access to it.`);
      } else if (error.message.includes("permission") || error.message.includes("authorize")) {
        console.error(`   You might not have permission to use this model with your current API key.`);
      }
    }
  }
  
  console.log("\n\n📋 Summary of Available Gemini Models:");
  console.log("1. The models that worked successfully can be used in your application.");
  console.log("2. For models that failed, you might need to request access in the Google AI Studio.");
  console.log("3. For image generation specifically, you might need to request special access or use a different API key.");
  console.log("\n🌟 Next Steps for Testing Image Generation:");
  console.log("1. Verify if your Google Cloud project has the Gemini API enabled.");
  console.log("2. Check if your API key has access to the image generation models in the Google AI Studio.");
  console.log("3. You might need to apply for access to the image generation models if they're in limited preview.");
  console.log("4. Consider checking the official documentation for any limitations or quotas.");
}

// Run the check
checkGeminiCapabilities(); 