import React from "react";
import { cn } from "@/lib/utils";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  // Format markdown-like content
  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Handle bullet points
      if (line.trim().startsWith('*')) {
        const text = line.replace(/^\s*\*\s*/, '');
        const parts = text.split('**');
        return (
          <li key={index} className="ml-4 mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-primary">{part}</strong> : part
            )}
          </li>
        );
      }
      // Handle bold text with **
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-primary">{part}</strong> : part
            )}
          </p>
        );
      }
      // Regular text
      if (line.trim()) {
        return <p key={index} className="mb-2">{line}</p>;
      }
      return <br key={index} />;
    });
  };

  return (
    <div
      className={cn(
        "flex w-full mb-6 animate-fadeIn",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 relative",
          isUser
            ? "bg-primary/10 border border-primary/30 text-foreground"
            : "bg-card border border-border text-foreground"
        )}
      >
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold font-mono shrink-0">
              AI
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm leading-relaxed">
              {formatContent(message.content)}
            </div>
            <p className="text-xs mt-2 text-muted-foreground font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {isUser && (
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold font-mono shrink-0">
              YOU
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
