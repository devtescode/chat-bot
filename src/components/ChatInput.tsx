import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "48px"; // reset height
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // reset first
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px"; // max 120px
    }
  };

  return (
    <div className="border-t border-border bg-chat-input p-4">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="min-h-[48px] max-h-[120px] resize-none bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl overflow-hidden"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          size="icon"
          className="h-12 w-12 rounded-xl shrink-0 transition-all duration-200 hover:scale-105"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  );
}
