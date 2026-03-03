import { Bot, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "./ChatInput";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
}

interface MessageBubbleProps {
  message: Message;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '• ');
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
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
          "max-w-[75%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-chat-user text-chat-user-foreground rounded-br-md"
            : "bg-chat-bot text-chat-bot-foreground rounded-bl-md"
        )}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att, i) =>
              att.type === "image" ? (
                <img
                  key={i}
                  src={att.dataUrl}
                  alt={att.name}
                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
                  onClick={() => window.open(att.dataUrl, "_blank")}
                />
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-background/20 rounded-lg px-3 py-2"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="text-xs truncate max-w-[150px]">{att.name}</span>
                </div>
              )
            )}
          </div>
        )}

        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.role === "assistant" ? stripMarkdown(message.content) : message.content}
          </p>
        )}
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
      </div>
    </div>
  );
}
