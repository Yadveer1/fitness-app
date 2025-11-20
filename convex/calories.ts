import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

      // Initialize Gemini Vision model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
      });

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

      // Generate content with vision
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
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
      throw new Error(
        `Failed to analyze food image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
