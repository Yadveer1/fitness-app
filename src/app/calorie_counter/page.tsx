"use client";

import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Upload, Loader2, Camera, X } from "lucide-react";
import Image from "next/image";

interface FoodAnalysis {
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
}

const CalorieCounterPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFoodImage = useAction(api.calories.analyzeFoodImage);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);
    setError(null);
    setAnalysis(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedImage) {
      setError("Please select an image first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert image to base64
      const base64Data = selectedImage.split(",")[1];
      const mimeType = imageFile.type;

      // Call Gemini API via Convex
      const result = await analyzeFoodImage({
        imageData: base64Data,
        mimeType: mimeType,
      });

      setAnalysis(result);
    } catch (err) {
      console.error("Error analyzing image:", err);
      
      // Extract user-friendly error message
      let errorMessage = "Failed to analyze the image. Please try again.";
      
      if (err instanceof Error) {
        // Check if it's a Convex error with our custom message
        if (err.message.includes("AI service is currently busy")) {
          errorMessage = "The AI service is currently busy. Please wait a moment and try again.";
        } else if (err.message.includes("API configuration error")) {
          errorMessage = "Service configuration error. Please contact support.";
        } else if (err.message.includes("quota exceeded")) {
          errorMessage = "Service limit reached. Please try again later.";
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-transparent from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mb-4 md:mb-6 shadow-lg">
            <Camera className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Calorie Counter
          </h1>
          <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-2xl mx-auto px-4">
            Upload a photo of your food and get instant nutritional information powered by AI
          </p>
        </div>

        <div className={`${analysis || isAnalyzing ? 'grid lg:grid-cols-2 gap-6 md:gap-8' : 'max-w-2xl mx-auto'}`}>
          {/* Upload Section */}
          <Card className="backdrop-blur-sm bg-card/50 border-2 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload Food Image
              </CardTitle>
              <CardDescription className="text-base">
                Take a photo or upload an image of your food
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all duration-300 ${
                  selectedImage
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-inner"
                    : isDragging
                    ? "border-primary bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-primary/50 cursor-pointer hover:bg-accent/50 hover:scale-[1.01]"
                }`}
                onClick={() => !selectedImage && fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedImage ? (
                  <div className="relative group">
                    <div className="relative w-full aspect-square max-w-md mx-auto overflow-hidden rounded-xl shadow-lg">
                      <Image
                        src={selectedImage}
                        alt="Selected food"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 shadow-lg hover:scale-110 transition-transform duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-8">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                      <Camera className="relative w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
                    </div>
                    <div>
                      <p className="text-lg md:text-xl font-semibold mb-2">
                        {isDragging ? "Drop your image here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG, JPEG up to 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {error && (
                <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3 rounded-lg shadow-md animate-in slide-in-from-top-2 duration-300">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 h-11 hover:bg-primary/10 hover:border-primary transition-all duration-200"
                  disabled={isAnalyzing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedImage || isAnalyzing}
                  className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Analyze Food
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section - Only show when analyzing or analysis complete */}
          {(analysis || isAnalyzing) && (
            <Card className="backdrop-blur-sm bg-card/50 border-2 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  Nutritional Information
                </CardTitle>
                <CardDescription className="text-base">
                  AI-powered analysis of your food
                </CardDescription>
              </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-6 animate-in fade-in-50 duration-500">
                  {/* Food Name and Confidence */}
                  <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 border border-border/50">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">{analysis.foodName}</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-3 leading-relaxed">
                      {analysis.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${getConfidenceColor(analysis.confidence)} bg-current/10`}>
                        {analysis.confidence.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Calories - Main Highlight */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 rounded-2xl p-6 md:p-8 text-center shadow-2xl border-2 border-primary/20">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
                    <div className="relative">
                      <p className="text-sm md:text-base text-primary-foreground/80 mb-2 font-medium">Total Calories</p>
                      <p className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
                        {analysis.calories}
                      </p>
                      <p className="text-sm md:text-base text-primary-foreground/90 font-medium">
                        per {analysis.servingSize}
                      </p>
                    </div>
                    <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                  </div>

                  {/* Macronutrients */}
                  <div>
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full" />
                      Macronutrients
                    </h4>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 md:p-5 hover:shadow-lg hover:scale-105 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <p className="text-sm text-muted-foreground font-medium">Protein</p>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{analysis.nutritionalInfo.protein}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-4 md:p-5 hover:shadow-lg hover:scale-105 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          <p className="text-sm text-muted-foreground font-medium">Carbs</p>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{analysis.nutritionalInfo.carbs}</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 md:p-5 hover:shadow-lg hover:scale-105 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          <p className="text-sm text-muted-foreground font-medium">Fat</p>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analysis.nutritionalInfo.fat}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 md:p-5 hover:shadow-lg hover:scale-105 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <p className="text-sm text-muted-foreground font-medium">Fiber</p>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{analysis.nutritionalInfo.fiber}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    className="w-full h-11 hover:bg-primary/10 hover:border-primary transition-all duration-200 font-medium"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Analyze Another Food
                  </Button>
                </div>
              ) : (
                <div className="text-center py-16 md:py-20">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                    <Upload className="relative w-16 h-16 md:w-20 md:h-20 mx-auto text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto leading-relaxed">
                    {isAnalyzing
                      ? "Analyzing your food image with AI..."
                      : "Upload an image and click Analyze to see nutritional information"}
                  </p>
                  {isAnalyzing && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

      </div>
    </div>
  );
};

export default CalorieCounterPage;