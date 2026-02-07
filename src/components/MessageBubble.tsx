import { Bot, User, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '') // Remove headers (###)
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold (**)
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic (*)
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/^[-*]\s+/gm, '• '); // Convert list markers to bullets
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = message.role === "assistant" ? stripMarkdown(message.content) : message.content;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);

      // Reset the icon after 8 seconds
      setTimeout(() => setCopied(false), 6000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in relative",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary" : "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-foreground" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[75%] px-4 py-3 rounded-2xl relative",
          isUser
            ? "bg-chat-user text-chat-user-foreground rounded-br-md"
            : "bg-chat-bot text-chat-bot-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

        {/* Timestamp */}
        <span
          className={cn(
            "text-[10px] mt-1 block",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {/* Copy button for assistant messages */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute top-1 right-1 p-1 rounded hover:bg-secondary/20 transition"
            title={copied ? "Copied!" : "Copy message"}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
