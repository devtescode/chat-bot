import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Plus, Camera, Mic, X, MicOff, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface ChatAttachment {
  type: "image" | "file";
  name: string;
  dataUrl: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const preRecordingTextRef = useRef("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !disabled) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith("image/");
      setAttachments((prev) => [
        ...prev,
        {
          type: isImage ? "image" : "file",
          name: file.name,
          dataUrl,
          mimeType: file.type,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach(processFile);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  /* ─── Voice Recording ─── */
  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser. Try Chrome on your phone.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    preRecordingTextRef.current = input;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let retryCount = 0;
    const maxRetries = 3;

    recognition.onresult = (event: any) => {
      retryCount = 0; // reset on success
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const prefix = preRecordingTextRef.current;
      const separator = prefix ? " " : "";
      setInput(prefix + separator + finalText + interimText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error === "network" && retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          try { recognition.start(); } catch { /* ignore */ }
        }, 500);
        return;
      }
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Allow it in browser settings.");
      } else if (event.error === "network") {
        toast.error("Speech recognition needs internet. Check your connection.");
      } else if (event.error !== "aborted") {
        toast.error("Voice recognition error. Try again.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Don't auto-stop if still recording (browser may cut short)
      if (isRecording && retryCount < maxRetries) {
        try { recognition.start(); } catch { setIsRecording(false); }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      toast.success("Listening... Speak now!");
    } catch {
      toast.error("Could not start voice recognition.");
    }
  };

  /* ─── Live Camera ─── */
  const openLiveCamera = async () => {
    setMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Fallback to file input camera
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setAttachments((prev) => [
      ...prev,
      { type: "image", name: `photo_${Date.now()}.jpg`, dataUrl, mimeType: "image/jpeg" },
    ]);
    closeCamera();
    toast.success("Photo captured!");
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  return (
    <div className="border-t border-border bg-chat-input p-4">
      <div className="max-w-3xl mx-auto">
        {/* Live camera viewfinder */}
        {showCamera && (
          <div className="relative mb-3 rounded-xl overflow-hidden border border-border bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[300px] object-cover"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={closeCamera}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                onClick={capturePhoto}
              >
                <Camera className="h-4 w-4 mr-1" /> Capture
              </Button>
            </div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="relative group rounded-xl overflow-hidden border border-border bg-secondary/50"
              >
                {att.type === "image" ? (
                  <img src={att.dataUrl} alt={att.name} className="h-20 w-20 object-cover" />
                ) : (
                  <div className="h-20 w-20 flex flex-col items-center justify-center p-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                      {att.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Plus menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-xl shrink-0 mb-1 transition-transform duration-200 ${
                  menuOpen ? "rotate-45" : ""
                } ${isRecording ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                disabled={disabled}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                className="justify-start gap-2 text-sm"
                onClick={openLiveCamera}
              >
                <Camera className="h-4 w-4" /> Use Camera
              </Button>
              {/* <Button
                variant="ghost"
                className="justify-start gap-2 text-sm"
                onClick={() => { cameraInputRef.current?.click(); setMenuOpen(false); }}
              >
                <ImageIcon className="h-4 w-4" /> Use Photo
              </Button> */}
              <Button
                variant="ghost"
                className="justify-start gap-2 text-sm"
                onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}
              >
                <ImageIcon className="h-4 w-4" /> Choose Image
              </Button>
              {/* <Button
                variant="ghost"
                className={`justify-start gap-2 text-sm ${isRecording ? "text-destructive" : ""}`}
                onClick={() => { toggleVoiceRecording(); setMenuOpen(false); }}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? "Stop Recording" : "Voice Note"}
              </Button> */}
            </PopoverContent>
          </Popover>

          {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple className="hidden" onChange={handleFileSelect} />

          {/* Text input */}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "🎙️ Listening... speak now" : "Type a message..."}
            disabled={disabled}
            className="min-h-[48px] max-h-[120px] resize-none bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl flex-1"
            rows={1}
          />

          {/* Recording stop button (visible during recording) */}
          {isRecording && (
            <Button
              onClick={toggleVoiceRecording}
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-xl shrink-0 animate-pulse"
            >
              <MicOff className="h-5 w-5" />
            </Button>
          )}

          {/* Send */}
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || disabled}
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0 transition-all duration-200 hover:scale-105"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
