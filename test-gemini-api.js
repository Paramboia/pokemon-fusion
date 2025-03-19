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

async function testGeminiConnection() {
  try {
    // List available models (this is a simple API call to verify connectivity)
    console.log("🔍 Testing Gemini API connectivity...");
    
    // Try to access the model to verify API key works
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",  // Using a standard model for testing connectivity
    });
    
    // Test with a simple text generation to verify API key works
    const result = await model.generateContent("Hello, Gemini! This is a test to verify API connectivity.");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Successfully connected to Gemini API!");
    console.log("✅ Model response: ", text.substring(0, 100) + "...");
    
    // Now check if the image generation model is available
    console.log("🔍 Checking if gemini-2.0-flash-exp-image-generation model is available...");
    try {
      const imageGenModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
      });
      
      // We don't actually generate an image, just check if the model can be accessed
      console.log("✅ Successfully accessed the gemini-2.0-flash-exp-image-generation model!");
      console.log("The API key appears to be working correctly with the target model.");
    } catch (imageGenError) {
      console.error("❌ Could not access the image generation model:", imageGenError.message);
      console.log("This could be due to lack of access to this specific model with your API key.");
    }
    
  } catch (error) {
    console.error("❌ Error connecting to Gemini API:", error.message);
    if (error.message.includes("API key")) {
      console.error("The API key may be invalid or you might not have access to the Gemini API.");
    }
  }
}

// Run the test
testGeminiConnection(); 