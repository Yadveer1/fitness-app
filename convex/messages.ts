import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

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
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isOverloaded = errorMessage.includes("overloaded") || errorMessage.includes("503");
      
      if (isOverloaded && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError!;
}

// Get all messages for a user
export const getMessages = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
    return messages;
  },
});

// Add a message
export const addMessage = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      userId: args.userId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    });

    return messageId;
  },
});

// Clear all messages for a user
export const clearMessages = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
});

// Generate AI response with Gemini
export const generateResponse = action({
  args: {
    userId: v.string(),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables");
      }

      // Add user message to database
      await ctx.runMutation(api.messages.addMessage, {
        userId: args.userId,
        role: "user",
        content: args.userMessage,
      });

      // Get conversation history for context
      const messages = await ctx.runQuery(api.messages.getMessages, {
        userId: args.userId,
      });

      // Build conversation history for Gemini
      const conversationHistory = messages
        .slice(-11, -1) // Get last 10 messages excluding the one we just added
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      const systemInstruction = `You are an AI assistant for a fitness application. 
        Your purpose is to provide accurate, clear, and helpful responses only about:
        - Fitness
        - Workouts
        - Exercise routines
        - Diet plans
        - Nutrition
        - Healthy lifestyle
        - Weight loss or weight gain
        - Muscle building
        - Wellness and physical health improvement

        STRICT RULES:
        1. Do NOT answer any question that is not related to fitness, health, exercise, or diet.
        2. If a user asks anything outside these topics, politely decline by saying:
          "I can help only with fitness, diet, or health-related questions."
        3. Keep responses simple, practical, and beginner-friendly unless the user asks for advanced details.
        4. Ensure that safety is prioritized—avoid suggesting extreme diets or dangerous workouts.
        5. When giving workout plans or diet recommendations, generalize them unless the user provides personal details (age, weight, goal, etc.).

        Your role is ONLY to help users improve their fitness, diet, and health.
        `;

      // Generate response with retry and fallback
      const generateContent = async () => {
        try {
          // Try primary model
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            systemInstruction,
          });

          const chat = model.startChat({
            history: conversationHistory,
          });

          const result = await chat.sendMessage(args.userMessage);
          return result.response.text();
        } catch (primaryError) {
          const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
          
          // If primary model fails, try fallback
          if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
            console.log("Primary model overloaded, trying fallback model...");
            const fallbackModel = genAI.getGenerativeModel({ 
              model: "gemini-2.5-pro",
              generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
              },
              systemInstruction,
            });

            const chat = fallbackModel.startChat({
              history: conversationHistory,
            });

            const result = await chat.sendMessage(args.userMessage);
            return result.response.text();
          }
          
          throw primaryError;
        }
      };

      // Execute with retry logic
      const aiResponse = await retryWithBackoff(generateContent, 3, 2000);

      // Add AI response to database
      await ctx.runMutation(api.messages.addMessage, {
        userId: args.userId,
        role: "assistant",
        content: aiResponse,
      });

      return aiResponse;
    } catch (error) {
      console.error("Detailed error generating response:", error);
      
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide user-friendly error messages
      if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
        throw new Error("The AI service is currently busy. Please try again in a few moments.");
      } else if (errorMessage.includes("API key") || errorMessage.includes("API_KEY_INVALID")) {
        throw new Error("API configuration error. Please contact support.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("QUOTA_EXCEEDED")) {
        throw new Error("API quota exceeded. Please try again later.");
      }
      
      throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
  },
});
