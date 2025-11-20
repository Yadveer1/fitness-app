import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        systemInstruction: `You are an AI assistant for a fitness application. 
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
          “I can help only with fitness, diet, or health-related questions.”
        3. Keep responses simple, practical, and beginner-friendly unless the user asks for advanced details.
        4. Ensure that safety is prioritized—avoid suggesting extreme diets or dangerous workouts.
        5. When giving workout plans or diet recommendations, generalize them unless the user provides personal details (age, weight, goal, etc.).

        Your role is ONLY to help users improve their fitness, diet, and health.
        `,
      });

      // Start chat with history
      const chat = model.startChat({
        history: conversationHistory,
      });

      // Send the current message
      const result = await chat.sendMessage(args.userMessage);
      const response = result.response;
      const aiResponse = response.text();

      // Add AI response to database
      await ctx.runMutation(api.messages.addMessage, {
        userId: args.userId,
        role: "assistant",
        content: aiResponse,
      });

      return aiResponse;
    } catch (error) {
      console.error("Detailed error generating response:", error);
      
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
  },
});
