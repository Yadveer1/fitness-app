import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's an overload error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isOverloaded = errorMessage.includes("overloaded") || errorMessage.includes("503");
      
      if (isOverloaded && i < maxRetries - 1) {
        // Wait before retrying with exponential backoff
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError!;
}

// Analyze food image and return calorie information
export const analyzeFoodImage = action({
  args: {
    imageData: v.string(), // base64 encoded image
    mimeType: v.string(), // e.g., "image/jpeg", "image/png"
  },
  handler: async (ctx, args): Promise<{
    foodName: string;
    calories: number;
    servingSize: string;
    confidence: string;
    nutritionalInfo: {
      protein: string;
      carbs: string;
      fat: string;
      fiber: string;
    };
    description: string;
  }> => {
    try {
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables");
      }

      const prompt = `Analyze this food image and provide detailed nutritional information in the following JSON format:
{
  "foodName": "name of the food/dish",
  "calories": estimated calories (as a number),
  "servingSize": "estimated serving size (e.g., '1 plate', '200g', '1 cup')",
  "confidence": "high/medium/low - your confidence in the identification",
  "nutritionalInfo": {
    "protein": "estimated protein (e.g., '25g')",
    "carbs": "estimated carbohydrates (e.g., '45g')",
    "fat": "estimated fat (e.g., '15g')",
    "fiber": "estimated fiber (e.g., '5g')"
  },
  "description": "brief description of the food and any notable ingredients visible"
}

Please be as accurate as possible based on what you can see in the image. If you cannot identify the food clearly, set confidence to "low" and provide your best estimate.`;

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: args.imageData,
          mimeType: args.mimeType,
        },
      };

      // Try with retry logic and model fallback
      const generateContent = async () => {
        // Try primary model first
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
          });
          const result = await model.generateContent([prompt, imagePart]);
          return await result.response;
        } catch (primaryError) {
          const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
          
          // If primary model is overloaded, try fallback model
          if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
            console.log("Primary model overloaded, trying fallback model...");
            const fallbackModel = genAI.getGenerativeModel({ 
              model: "gemini-2.5-pro",
            });
            const result = await fallbackModel.generateContent([prompt, imagePart]);
            return await result.response;
          }
          
          throw primaryError;
        }
      };

      // Execute with retry logic
      const response = await retryWithBackoff(generateContent, 3, 2000);
      const text = response.text();

      // Parse JSON response
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      const parsedData = JSON.parse(jsonText);

      return {
        foodName: parsedData.foodName || "Unknown Food",
        calories: parsedData.calories || 0,
        servingSize: parsedData.servingSize || "Unknown",
        confidence: parsedData.confidence || "low",
        nutritionalInfo: {
          protein: parsedData.nutritionalInfo?.protein || "N/A",
          carbs: parsedData.nutritionalInfo?.carbs || "N/A",
          fat: parsedData.nutritionalInfo?.fat || "N/A",
          fiber: parsedData.nutritionalInfo?.fiber || "N/A",
        },
        description: parsedData.description || "Could not analyze the food.",
      };
    } catch (error) {
      console.error("Error analyzing food image:", error);
      
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide user-friendly error messages
      if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
        throw new Error("The AI service is currently busy. Please try again in a few moments.");
      } else if (errorMessage.includes("API key") || errorMessage.includes("API_KEY_INVALID")) {
        throw new Error("API configuration error. Please contact support.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("QUOTA_EXCEEDED")) {
        throw new Error("API quota exceeded. Please try again later.");
      } else if (errorMessage.includes("SAFETY")) {
        throw new Error("The image was blocked by safety filters. Please try a different image.");
      } else if (errorMessage.includes("invalid") && errorMessage.includes("image")) {
        throw new Error("Invalid image format. Please try a different image.");
      }
      
      // Include the actual error message for debugging
      throw new Error(`Failed to analyze the image: ${errorMessage}`);
    }
  },
});
