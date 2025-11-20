"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChatBotPage = () => {
  const { user } = useUser();
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convex queries and mutations
  const messages = useQuery(
    api.messages.getMessages,
    user ? { userId: user.id } : "skip"
  );

  const clearMessages = useMutation(api.messages.clearMessages);
  const generateResponse = useAction(api.messages.generateResponse);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClearChat = async () => {
    if (!user || !confirm("Are you sure you want to clear all messages?")) return;

    try {
      await clearMessages({ userId: user.id });
    } catch (error) {
      console.error("Error clearing messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      await generateResponse({
        userId: user.id,
        userMessage: messageText,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-xl" />
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary relative" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2 font-mono">
            Please Sign In
          </h2>
          <p className="text-muted-foreground">
            You need to be signed in to use the chatbot
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-24 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 relative custom-scrollbar">
        {messages && messages.length > 0 && (
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 z-10 border-primary/50 text-primary hover:bg-primary/10 bg-background/80 backdrop-blur-sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        )}
        <div className="container mx-auto max-w-4xl">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="relative inline-block mb-6">
                {/* Corner decorations */}
                <div className="absolute -inset-4">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/50" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary/50" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary/50" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/50" />
                </div>
                
                <div className="relative bg-primary/10 rounded-lg p-6 border border-primary/30">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3 font-mono">
                Start Your <span className="text-primary">Fitness Journey</span>
              </h2>
              
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary to-transparent mb-4" />
              
              <p className="text-muted-foreground max-w-md font-mono text-sm">
                Ask me anything about fitness, workouts, nutrition, or health.
                I&apos;m here to help you achieve your goals.
              </p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setInputMessage("What's a good beginner workout routine?")}>
                  <p className="text-sm font-mono text-foreground">💪 Workout routines</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setInputMessage("How should I structure my diet?")}>
                  <p className="text-sm font-mono text-foreground">🥗 Nutrition advice</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setInputMessage("Tips for building muscle?")}>
                  <p className="text-sm font-mono text-foreground">🏋️ Muscle building</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setInputMessage("How can I lose weight effectively?")}>
                  <p className="text-sm font-mono text-foreground">🔥 Weight loss tips</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message._id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-6">
                  <div className="bg-card border border-border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold font-mono">
                        AI
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        value={inputMessage}
        onChange={setInputMessage}
        onSubmit={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ask me anything about fitness..."
      />
    </div>
  );
};

export default ChatBotPage;