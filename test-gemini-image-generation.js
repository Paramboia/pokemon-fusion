require('dotenv').config({ path: './.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in environment variables");
  process.exit(1);
}

console.log("✅ GEMINI_API_KEY found in environment variables");

// Initialize the Generative AI API
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiImageGeneration() {
  try {
    console.log("🔍 Testing Gemini Image Generation model...");
    
    // Access the image generation model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
    });
    
    // Simple prompt for image generation - very generic landscape request
    const prompt = "Generate a simple landscape painting of mountains with a blue sky and green grass in the foreground.";
    
    console.log("🖼️ Attempting to generate an image with prompt:");
    console.log(prompt);
    
    // Generate the image
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Check if we have media in the response
    if (response.candidates && 
        response.candidates[0] && 
        response.candidates[0].content && 
        response.candidates[0].content.parts && 
        response.candidates[0].content.parts.length > 0) {
      
      const parts = response.candidates[0].content.parts;
      
      // Find any image data in the response
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data && part.inlineData.mimeType.startsWith('image/')) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          const fileExtension = mimeType.split('/')[1];
          
          // Save the image to a file
          const outputDir = './test-output';
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
          }
          
          const outputPath = path.join(outputDir, `generated-landscape.${fileExtension}`);
          fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
          
          console.log(`✅ Image generated successfully and saved to: ${outputPath}`);
          return;
        }
      }
      
      console.error("❌ No image data found in the response");
      console.log("Response structure:", JSON.stringify(response.candidates[0].content, null, 2));
    } else {
      console.error("❌ Unexpected response format");
      console.log("Response:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("❌ Error generating image with Gemini:", error.message);
    console.error("Error details:", error);
    
    if (error.message.includes("Permission denied") || error.message.includes("not authorized")) {
      console.error("You may not have access to the image generation feature with your current API key or account.");
      console.error("Check if this model is available for your account in the Google AI Studio.");
    }
  }
}

// Run the test
testGeminiImageGeneration(); 