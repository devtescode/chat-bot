import { useState, useEffect, useRef } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { MessageBubble, Message } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/chatApi";
import { toast } from "sonner";

const STORAGE_KEY = "chatMessages";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true";
    }
    return false;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error("Failed to parse saved messages:", e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const assistantId = generateId();
    let assistantContent = "";

    // Prepare messages for API (only role and content)
    const apiMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await streamChat({
      messages: apiMessages,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantId) {
            return prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            );
          }
          return [
            ...prev,
            {
              id: assistantId,
              role: "assistant" as const,
              content: assistantContent,
              timestamp: new Date(),
            },
          ];
        });
      },
      onDone: () => {
        setIsTyping(false);
      },
      onError: (error) => {
        setIsTyping(false);
        toast.error(error);
      },
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen bg-chat-container">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Chat Buddy</h1>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="rounded-full hover:bg-secondary"
            title="Clear chat"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <ThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-20 animate-slide-up">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Start a conversation
              </h2>
              <p className="text-muted-foreground text-center max-w-sm">
                Send a message to begin chatting. Your conversation will be saved locally.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
