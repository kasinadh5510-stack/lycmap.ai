import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, 
  useGetOpenaiConversation, 
  useCreateOpenaiConversation,
  useUploadDocument
} from "@workspace/api-client-react";
import { useVoiceRecorder, useVoiceStream } from "@workspace/integrations-openai-ai-react";
import { 
  MessageSquare, Plus, Mic, MicOff, Send, Paperclip, 
  Loader2, Bot, User, FileText, Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { toast } = useToast();
  
  // Queries & Mutations
  const { data: conversations, refetch: refetchList } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const uploadDoc = useUploadDocument();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const { data: activeConv, refetch: refetchConv } = useGetOpenaiConversation(activeId!, {
    query: { enabled: !!activeId }
  });

  // State
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync server messages to local state
  useEffect(() => {
    if (activeConv?.messages) {
      setLocalMessages(activeConv.messages);
    }
  }, [activeConv]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, streamingMsg]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const handleCreate = () => {
    createConv.mutate({ data: { title: "New Study Session" } }, {
      onSuccess: (res) => {
        setActiveId(res.id);
        refetchList();
      }
    });
  };

  const sendTextMessage = async (text: string) => {
    if (!activeId || !text.trim() || isSending) return;
    
    setIsSending(true);
    setInput("");
    
    // Optimistic user message
    setLocalMessages(prev => [...prev, { role: "user", content: text, id: Date.now() }]);

    try {
      const res = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentAsstMsg = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                currentAsstMsg += data.content;
                setStreamingMsg(currentAsstMsg);
              }
            } catch (e) {
              // Parse error on incomplete chunks, ignore
            }
          }
        }
      }

      setStreamingMsg("");
      refetchConv();
    } catch (e) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Voice setup
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const voiceStream = useVoiceStream({
    workletPath: import.meta.env.BASE_URL + "audio-playback-worklet.js",
    onTranscript: (type, text) => {
      // Could show live transcript if desired
    }
  });

  const handleMic = async () => {
    if (!activeId) return;

    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        setIsSending(true);
        setStreamingMsg("..."); // Processing indicator
        
        try {
          await voiceStream.streamVoiceResponse(
            `/api/openai/conversations/${activeId}/voice-messages`,
            blob
          );
        } catch (e) {
          toast({ title: "Voice chat failed", variant: "destructive" });
        } finally {
          setStreamingMsg("");
          refetchConv();
          setIsSending(false);
        }
      }
    } else {
      await startRecording();
    }
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      let mimeType = file.type;
      
      // Fallbacks if browser doesn't provide MIME
      if (!mimeType) {
        if (fileExt === 'pdf') mimeType = 'application/pdf';
        else if (['jpg', 'jpeg'].includes(fileExt)) mimeType = 'image/jpeg';
        else if (fileExt === 'png') mimeType = 'image/png';
        else mimeType = 'application/octet-stream';
      }

      toast({ title: "Uploading document..." });
      
      uploadDoc.mutate({ 
        data: { fileName: file.name, mimeType, fileData: base64 } 
      }, {
        onSuccess: (data) => {
          toast({ title: "Document processed", description: "Asking AI to explain it." });
          sendTextMessage(`I've uploaded a document. Here is the extracted content:\n\n${data.extractedText}\n\nPlease help me understand it or summarize the key concepts.`);
        },
        onError: () => {
          toast({ title: "Upload failed", variant: "destructive" });
        }
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] md:h-screen w-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border/50 bg-card/20 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-border/50">
          <Button 
            onClick={handleCreate} 
            className="w-full justify-start font-bold h-12 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-none"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Session
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                  activeId === conv.id 
                    ? "bg-secondary border border-border" 
                    : "hover:bg-secondary/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  activeId === conv.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                )}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium text-sm truncate">{conv.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
            {conversations?.length === 0 && (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No conversations yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        {activeId ? (
          <>
            {/* Header mobile */}
            <div className="lg:hidden p-4 border-b border-border/50 flex items-center justify-between bg-card/20">
              <span className="font-medium">Session Chat</span>
              <Button size="sm" variant="outline" onClick={handleCreate}>New</Button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth"
            >
              {localMessages.length === 0 && !streamingMsg && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">How can I help you study?</h3>
                  <p className="text-muted-foreground">
                    Ask me a question, record a voice message, or upload a document/image for analysis.
                  </p>
                </div>
              )}

              {localMessages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex gap-4 max-w-3xl",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}>
                  <div className={cn(
                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                    msg.role === "user" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary border border-primary/20"
                  )}>
                    {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl whitespace-pre-wrap leading-relaxed",
                    msg.role === "user" 
                      ? "bg-secondary text-secondary-foreground rounded-tr-sm" 
                      : "bg-card border border-border/50 shadow-sm rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Streaming Assistant Message */}
              {streamingMsg && (
                <div className="flex gap-4 max-w-3xl mr-auto">
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-primary/20 text-primary border border-primary/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm rounded-tl-sm whitespace-pre-wrap leading-relaxed">
                    {streamingMsg}
                    {streamingMsg === "..." && <span className="animate-pulse"> Thinking</span>}
                    <span className="ml-1 inline-block w-2 h-4 bg-primary animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur">
              <div className="max-w-4xl mx-auto relative flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0 h-12 w-12 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || uploadDoc.isPending}
                >
                  {uploadDoc.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>

                <div className="flex-1 relative">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendTextMessage(input);
                      }
                    }}
                    placeholder={isRecording ? "Listening..." : "Ask your AI tutor..."}
                    className="w-full h-12 pl-4 pr-12 rounded-full bg-background border-border/50 text-base shadow-inner focus-visible:ring-primary/50"
                    disabled={isSending || isRecording}
                  />
                  {input.trim() && !isRecording && (
                    <Button 
                      onClick={() => sendTextMessage(input)}
                      disabled={isSending}
                      size="icon"
                      className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {!input.trim() && (
                  <Button 
                    type="button" 
                    variant={isRecording ? "default" : "secondary"}
                    size="icon"
                    className={cn(
                      "shrink-0 h-12 w-12 rounded-full transition-all",
                      isRecording 
                        ? "bg-destructive hover:bg-destructive/90 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse" 
                        : "hover:text-primary hover:bg-primary/10"
                    )}
                    onClick={handleMic}
                    disabled={isSending && !isRecording}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                )}
              </div>
              <div className="text-center mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Powered by OpenAI
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 max-w-sm">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Active Session</h2>
              <p className="text-muted-foreground mb-6">Create a new session to start chatting with your AI Tutor.</p>
              <Button onClick={handleCreate} className="lg:hidden">New Session</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
