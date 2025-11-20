import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// validate and fix workout plan to ensure it has proper numeric types
function validateWorkoutPlan(plan: any) {
  if (plan.exercises) {
    plan.exercises = plan.exercises.map((exercise: any) => ({
      ...exercise,
      routines: exercise.routines.map((routine: any) => ({
        ...routine,
        sets: typeof routine.sets === "number" ? routine.sets : parseInt(routine.sets) || 3,
        reps: typeof routine.reps === "number" ? routine.reps : parseInt(routine.reps) || 10,
      })),
    }));
  }
  return plan;
}

// validate diet plan to ensure it strictly follows schema
function validateDietPlan(plan: any) {
  return {
    dailyCalories: typeof plan.dailyCalories === "number" ? plan.dailyCalories : parseInt(plan.dailyCalories) || 2000,
    meals: plan.meals.map((meal: any) => ({
      name: meal.name,
      foods: meal.foods,
    })),
  };
}

export const generatePlan = action({
  args: {
    userId: v.string(),
    age: v.string(),
    height: v.string(),
    weight: v.string(),
    injuries: v.string(),
    workout_days: v.string(),
    fitness_goal: v.string(),
    fitness_level: v.string(),
    dietary_restrictions: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const {
      userId,
      age,
      height,
      weight,
      injuries,
      workout_days,
      fitness_goal,
      fitness_level,
      dietary_restrictions,
    } = args;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        responseMimeType: "application/json",
      },
    });

    const workoutPrompt = `You are an experienced fitness coach creating a personalized workout plan based on:
    Age: ${age}
    Height: ${height}
    Weight: ${weight}
    Injuries or limitations: ${injuries}
    Available days for workout: ${workout_days}
    Fitness goal: ${fitness_goal}
    Fitness level: ${fitness_level}
    
    As a professional coach:
    - Consider muscle group splits to avoid overtraining the same muscles on consecutive days
    - Design exercises that match the fitness level and account for any injuries
    - Structure the workouts to specifically target the user's fitness goal
    
    CRITICAL SCHEMA INSTRUCTIONS:
    - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
    - "sets" and "reps" MUST ALWAYS be NUMBERS, never strings
    - For example: "sets": 3, "reps": 10
    - Do NOT use text like "reps": "As many as possible" or "reps": "To failure"
    - Instead use specific numbers like "reps": 12 or "reps": 15
    - For cardio, use "sets": 1, "reps": 1 or another appropriate number
    - NEVER include strings for numerical fields
    - NEVER add extra fields not shown in the example below
    
    Return a JSON object with this EXACT structure:
    {
      "schedule": ["Monday", "Wednesday", "Friday"],
      "exercises": [
        {
          "day": "Monday",
          "routines": [
            {
              "name": "Exercise Name",
              "sets": 3,
              "reps": 10
            }
          ]
        }
      ]
    }
    
    DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

    const workoutResult = await model.generateContent(workoutPrompt);
    const workoutPlanText = workoutResult.response.text();

    let workoutPlan = JSON.parse(workoutPlanText);
    workoutPlan = validateWorkoutPlan(workoutPlan);

    const dietPrompt = `You are an experienced nutrition coach creating a personalized diet plan based on:
      Age: ${age}
      Height: ${height}
      Weight: ${weight}
      Fitness goal: ${fitness_goal}
      Dietary restrictions: ${dietary_restrictions}
      
      As a professional nutrition coach:
      - Calculate appropriate daily calorie intake based on the person's stats and goals
      - Create a balanced meal plan with proper macronutrient distribution
      - Include a variety of nutrient-dense foods while respecting dietary restrictions
      - Consider meal timing around workouts for optimal performance and recovery
      
      CRITICAL SCHEMA INSTRUCTIONS:
      - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
      - "dailyCalories" MUST be a NUMBER, not a string
      - DO NOT add fields like "supplements", "macros", "notes", or ANYTHING else
      - ONLY include the EXACT fields shown in the example below
      - Each meal should include ONLY a "name" and "foods" array

      Return a JSON object with this EXACT structure and no other fields:
      {
        "dailyCalories": 2000,
        "meals": [
          {
            "name": "Breakfast",
            "foods": ["Oatmeal with berries", "Greek yogurt", "Black coffee"]
          },
          {
            "name": "Lunch",
            "foods": ["Grilled chicken salad", "Whole grain bread", "Water"]
          }
        ]
      }
      
      DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

    const dietResult = await model.generateContent(dietPrompt);
    const dietPlanText = dietResult.response.text();

    let dietPlan = JSON.parse(dietPlanText);
    dietPlan = validateDietPlan(dietPlan);

    const planId: any = await ctx.runMutation(api.plans.createPlan, {
      userId,
      dietPlan,
      isActive: true,
      workoutPlan,
      name: `${fitness_goal} Plan - ${new Date().toLocaleDateString()}`,
    });

    return planId;
  },
});

export const createPlan = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    workoutPlan: v.object({
      schedule: v.array(v.string()),
      exercises: v.array(
        v.object({
          day: v.string(),
          routines: v.array(
            v.object({
              name: v.string(),
              sets: v.number(),
              reps: v.number(),
            })
          ),
        })
      ),
    }),
    dietPlan: v.object({
      dailyCalories: v.number(),
      meals: v.array(
        v.object({
          name: v.string(),
          foods: v.array(v.string()),
        })
      ),
    }),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const activePlans = await ctx.db
      .query("plans")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const plan of activePlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    const planId = await ctx.db.insert("plans", args);

    return planId;
  },
});

export const getUserPlans = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return plans;
  },
});
