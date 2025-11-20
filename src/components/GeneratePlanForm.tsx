 "use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";

const GeneratePlanForm = () => {
  const { user } = useUser();
  const router = useRouter();
  const generatePlan = useAction(api.plans.generatePlan);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: "",
    height: "",
    weight: "",
    injuries: "",
    workout_days: "",
    fitness_goal: "",
    fitness_level: "",
    dietary_restrictions: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      await generatePlan({
        userId: user.id,
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        injuries: formData.injuries || "None",
        workout_days: formData.workout_days,
        fitness_goal: formData.fitness_goal,
        fitness_level: formData.fitness_level,
        dietary_restrictions: formData.dietary_restrictions || "None",
      });

      // Redirect to profile page after successful generation
      router.push("/profile");
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Your Fitness Plan</h2>
        <p className="text-muted-foreground text-center mb-8">
          Fill out the form below to generate a personalized workout and diet plan
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Age */}
          <div>
            <label htmlFor="age" className="block text-sm font-medium mb-2">
              Age *
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="1"
              max="120"
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your age"
            />
          </div>

          {/* Height */}
          <div>
            <label htmlFor="height" className="block text-sm font-medium mb-2">
              Height *
            </label>
            <input
              type="text"
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., 5'10&quot; or 178 cm"
            />
          </div>

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="block text-sm font-medium mb-2">
              Weight *
            </label>
            <input
              type="text"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., 150 lbs or 68 kg"
            />
          </div>

          {/* Fitness Level */}
          <div>
            <label htmlFor="fitness_level" className="block text-sm font-medium mb-2">
              Fitness Level *
            </label>
            <select
              id="fitness_level"
              name="fitness_level"
              value={formData.fitness_level}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select your fitness level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Fitness Goal */}
          <div>
            <label htmlFor="fitness_goal" className="block text-sm font-medium mb-2">
              Fitness Goal *
            </label>
            <select
              id="fitness_goal"
              name="fitness_goal"
              value={formData.fitness_goal}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select your fitness goal</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="general_fitness">General Fitness</option>
              <option value="strength_training">Strength Training</option>
              <option value="endurance">Endurance</option>
            </select>
          </div>

          {/* Workout Days */}
          <div>
            <label htmlFor="workout_days" className="block text-sm font-medium mb-2">
              Workout Days Per Week *
            </label>
            <select
              id="workout_days"
              name="workout_days"
              value={formData.workout_days}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select days per week</option>
              <option value="3">3 days</option>
              <option value="4">4 days</option>
              <option value="5">5 days</option>
              <option value="6">6 days</option>
            </select>
          </div>

          {/* Injuries */}
          <div>
            <label htmlFor="injuries" className="block text-sm font-medium mb-2">
              Injuries or Limitations (Optional)
            </label>
            <textarea
              id="injuries"
              name="injuries"
              value={formData.injuries}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="e.g., Lower back pain, knee injury, etc. or leave blank if none"
            />
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label htmlFor="dietary_restrictions" className="block text-sm font-medium mb-2">
              Dietary Restrictions (Optional)
            </label>
            <textarea
              id="dietary_restrictions"
              name="dietary_restrictions"
              value={formData.dietary_restrictions}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="e.g., Vegetarian, vegan, gluten-free, etc. or leave blank if none"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-lg font-semibold"
          >
            {isLoading ? "Generating Your Plan..." : "Generate Fitness Plan"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default GeneratePlanForm;
