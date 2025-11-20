const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY not found in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // For newer versions of the SDK, model listing might be done differently or via REST.
    // However, a simple way to test availability is to try initializing a specific model 
    // or check documentation. The SDK itself doesn't always expose a 'listModels' method directly 
    // in the client instance in all versions, but we can try a standard fetch if the SDK method isn't obvious.
    
    // Using direct fetch to the models endpoint is often the most reliable way to see *everything*
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.models) {
      console.log("\nAvailable Gemini Models for your key:");
      console.log("-------------------------------------");
      data.models.forEach(model => {
        if (model.name.includes('gemini')) {
          console.log(`Name: ${model.name}`);
          console.log(`Display Name: ${model.displayName}`);
          console.log(`Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
          console.log("---");
        }
      });
    } else {
      console.log("No models found or error occurred:", data);
    }

  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();