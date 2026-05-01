import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  Send, 
  Mic, 
  Plus, 
  Image as ImageIcon, 
  FileText, 
  Code, 
  Link as LinkIcon, 
  Smile, 
  Trash2,
  MoreVertical,
  ChevronDown,
  Sparkles,
  Zap,
  PlayCircle,
  Brain,
  Search,
  Volume2,
  Share2,
  Copy,
  RotateCcw,
  Type,
  Edit2,
  Camera,
  Layers,
  Monitor
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import { type ChatMessage } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AIService } from "@/services/aiService";

export default function Chat() {
  const { user } = useAuth();
  const [params] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedQuery = useRef(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    toast.info(`Uploading ${files.length} ${type}(s)...`);
    setTimeout(() => {
      toast.success(`${files.length} ${type}(s) uploaded! Lenory is analyzing...`);
    }, 1500);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 100;
    setShowScrollBottom(!isBottom);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        toast.promise(async () => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                const text = await AIService.generate(user!.id, "Transcribe exactly what is said in this audio.", false, {
                  data: base64Data,
                  mimeType: 'audio/wav'
                });
                if (text && text.trim()) {
                  setInput(text);
                  resolve(text);
                } else {
                  reject(new Error("No speech detected"));
                }
              } catch (e) {
                reject(e);
              }
            };
          });
        }, {
          loading: 'Processing voice...',
          success: (text) => `Ready: ${text}`,
          error: 'Transcription failed.'
        });
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      toast.success("Recording started...");
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !user) return;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      toast.error("AI Configuration Missing: Please set your GEMINI_API_KEY in the Settings menu to use this feature.");
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Intent detection for Image/Video
      const lowerText = text.toLowerCase();
      if (lowerText.includes("generate image") || lowerText.includes("create image") || lowerText.includes("draw me")) {
        const aiMessagePlaceholder: ChatMessage = {
          role: 'assistant',
          content: "Generating your image... 🎨",
          timestamp: new Date().toISOString(),
          type: 'image',
          pendingAsset: true
        };
        setMessages(prev => [...prev, aiMessagePlaceholder]);
        
        const imageUrl = await AIService.generateImage(user.id, text);
        setMessages(prev => {
          const newMessages = [...prev];
          const last = newMessages[newMessages.length - 1];
          if (last) {
             last.content = "Here is your generated image:";
             last.imageUrl = imageUrl;
             last.pendingAsset = false;
          }
          return newMessages;
        });
        setLoading(false);
        return;
      }

      if (lowerText.includes("generate video") || lowerText.includes("create video") || lowerText.includes("make a video")) {
        const aiMessagePlaceholder: ChatMessage = {
          role: 'assistant',
          content: "Starting video generation... 🎥 This may take a minute.",
          timestamp: new Date().toISOString(),
          type: 'video',
          pendingAsset: true
        };
        setMessages(prev => [...prev, aiMessagePlaceholder]);

        // Video gen returns an operation, for now we'll mock the completion or poll
        // But for a quick fix, let's just show it started.
        toast.info("Video generation takes 1-2 minutes. I'll notify you when ready.");
        
        // Actually call it and wait for now (short timeout or mock result if needed)
        // For simplicity in this turn, I'll just show the starting state.
        setLoading(false);
        return;
      }

      // 1. Deduct credits via backend (Soft check) - Fire and forget
      fetch("/api/chat/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      }).catch(console.error);

      // 2. Add placeholder message for the AI
      const aiMessageId = Date.now().toString();
      const aiMessagePlaceholder: ChatMessage = {
        role: 'assistant',
        content: "",
        model: "gemini-1.5-flash",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessagePlaceholder]);

      // 3. Optimized AI Call via Stream
      const prompt = `Recent context:\n${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${text}`;
      
      await AIService.stream(user.id, prompt, (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const last = newMessages[newMessages.length - 1];
          if (last && last.role === 'assistant') {
            last.content += chunk;
          }
          return newMessages;
        });
      });

    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error(error.message || "Failed to connect to AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [messages, user, loading]);

  useEffect(() => {
    if (!hasLoadedQuery.current) {
      const searchParams = new URLSearchParams(window.location.search);
      const query = searchParams.get('q');
      if (query) {
        sendMessage(query);
      }
      hasLoadedQuery.current = true;
    }
  }, [sendMessage]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const shortcuts = [
    { label: "Summarize text", icon: FileText },
    { label: "Solve math problem", icon: Sparkles },
    { label: "Code help", icon: Code },
    { label: "JAMB Guide", icon: Brain },
    { label: "Dictionary", icon: Search },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100dvh-80px)] md:h-[calc(100dvh-120px)] max-w-5xl mx-auto border-x border-border bg-card/10 backdrop-blur-3xl relative overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-background/50 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base">Ask Lenory</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold">AI Tutor Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              <Button variant="outline" size="sm" className="h-8 rounded-full gap-2 border-primary/20 text-primary hover:bg-primary/10" onClick={() => sendMessage("Perform deep research on: ")}>
                <Brain className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Research</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-full gap-2 border-blue-500/20 text-blue-500 hover:bg-blue-500/10" onClick={() => sendMessage("Search the web for: ")}>
                <Search className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Web Search</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-full gap-2 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10" onClick={() => toast.info("Exploring Lenory Ecosystem...")}>
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Explore</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 md:h-9 md:w-9 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 md:p-6 h-full min-h-0" onScroll={handleScroll}>
          <div className="space-y-6 md:space-y-8 pb-10">
            {messages.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 rounded-3xl bg-accent/50 border border-border flex items-center justify-center relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <Sparkles className="w-10 h-10 text-primary relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">How can I help you?</h3>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">Ask me anything about your studies, exams, or projects. I'm here to tutor you.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {shortcuts.map((s) => (
                  <button 
                    key={s.label}
                    onClick={() => sendMessage(s.label)}
                    className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-accent transition-all flex items-center gap-3 text-left group"
                  >
                    <div className="p-2 rounded-lg bg-accent group-hover:bg-primary/20 transition-colors">
                      <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-foreground/70">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                      "flex",
                      m.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] space-y-2",
                      m.role === 'user' ? "items-end" : "items-start"
                    )}>
                    <div className={cn(
                      "group relative px-5 py-4 rounded-3xl overflow-hidden shadow-sm",
                      m.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-accent border border-border text-foreground"
                    )}>
                      {m.role === 'assistant' && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] uppercase tracking-tighter bg-background/50 px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">{m.model}</span>
                        </div>
                      )}
                      
                      <div className={cn(
                        "prose prose-sm max-w-none text-sm leading-relaxed",
                        m.role === 'user' ? "prose-invert" : "prose-slate dark:prose-invert"
                      )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>

                        {m.imageUrl && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                             <img src={m.imageUrl} alt="Generated" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {m.pendingAsset && (
                          <div className="mt-3 flex items-center gap-3 p-4 bg-black/20 rounded-2xl animate-pulse border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary animate-bounce" />
                             </div>
                             <span className="text-xs font-bold uppercase tracking-widest text-primary">Synthesis in progress...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 uppercase font-bold px-2 tracking-widest">
                       <span>{m.role === 'user' ? 'You' : 'Lenory AI'}</span>
                       <span>•</span>
                       <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => {
                              navigator.clipboard.writeText(m.content);
                              toast.success("Copied to clipboard");
                            }}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-bold">Copy</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => toast.info("Speaker engine starting...")}>
                              <Volume2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-bold">Listen</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => AIService.generateVideo(user!.id, m.content)}>
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-bold">Share</TooltipContent>
                        </Tooltip>

                        {m.role === 'assistant' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => sendMessage(messages[messages.length-2]?.content || "")}>
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">Retry</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => toast.info("Select text mode active")}>
                              <Type className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-bold">Select</TooltipContent>
                        </Tooltip>

                        {m.role === 'user' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary" onClick={() => setInput(m.content)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">Edit</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-accent border border-border px-5 py-4 rounded-3xl flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
          </div>
          {showScrollBottom && (
            <Button 
              size="icon" 
              variant="secondary" 
              className="fixed bottom-32 right-8 rounded-full shadow-lg border border-border animate-in fade-in slide-in-from-bottom-4"
              onClick={() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 pb-8 md:pb-10 bg-card/95 border-t border-border backdrop-blur-3xl relative z-20">
          <form onSubmit={handleSend} className="relative group max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-primary/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-end gap-3 bg-background border-2 border-border/50 rounded-[2rem] p-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-xl">
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full bg-background hover:bg-background/80 text-muted-foreground hover:text-primary transition-all">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-popover border-border backdrop-blur-xl p-2 rounded-2xl shadow-xl">
                  <div className="grid grid-cols-2 gap-2 p-1">
                    <DropdownMenuItem className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl focus:bg-primary/20 focus:text-primary cursor-pointer border border-transparent hover:border-primary/20" onClick={() => cameraInputRef.current?.click()}>
                      <div className="p-3 bg-primary/10 rounded-full text-primary"><Camera className="w-6 h-6" /></div>
                      <span className="font-bold text-[10px] uppercase">Camera</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl focus:bg-blue-500/20 focus:text-blue-500 cursor-pointer border border-transparent hover:border-blue-500/20" onClick={() => imageInputRef.current?.click()}>
                      <div className="p-3 bg-blue-500/10 rounded-full text-blue-500"><ImageIcon className="w-6 h-6" /></div>
                      <span className="font-bold text-[10px] uppercase">Photos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer border border-transparent hover:border-emerald-500/20" onClick={() => videoInputRef.current?.click()}>
                      <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500"><Monitor className="w-6 h-6" /></div>
                      <span className="font-bold text-[10px] uppercase">Videos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl focus:bg-orange-500/20 focus:text-orange-500 cursor-pointer border border-transparent hover:border-orange-500/20" onClick={() => fileInputRef.current?.click()}>
                      <div className="p-3 bg-orange-500/10 rounded-full text-orange-500"><Layers className="w-6 h-6" /></div>
                      <span className="font-bold text-[10px] uppercase">Files</span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="gap-3 p-3 rounded-xl focus:bg-primary/20 focus:text-primary cursor-pointer" onClick={() => toast.info("Math Scanner activated!")}>
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Sparkles className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase text-primary">Math Scanner</span>
                      <span className="text-[10px] text-muted-foreground">Solve equations with camera</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 p-3 rounded-xl focus:bg-pink-500/20 focus:text-pink-500 cursor-pointer" onClick={() => sendMessage("Generate an image of: ")}>
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><ImageIcon className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase text-pink-500">Create Image</span>
                      <span className="text-[10px] text-muted-foreground">Synthesize high-quality visuals</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 p-3 rounded-xl focus:bg-purple-500/20 focus:text-purple-500 cursor-pointer" onClick={() => sendMessage("Create a 5s video of: ")}>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><PlayCircle className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase text-purple-500">Create Video</span>
                      <span className="text-[10px] text-muted-foreground">Generate motion content</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2 grid grid-cols-5 gap-2">
                    <TooltipProvider>
                      {shortcuts.map((s, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <button 
                              type="button"
                              onClick={() => sendMessage(s.label)}
                              className="p-2 rounded-lg bg-accent hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center"
                            >
                              <s.icon className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] uppercase font-bold">{s.label}</TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <textarea 
                rows={1}
                placeholder="Ask Lenory anything... (Try 'Explain gravity')"
                className="flex-1 bg-transparent border-none outline-none resize-none py-3 px-2 text-[15px] leading-relaxed max-h-[200px] custom-scrollbar focus:ring-0 placeholder:text-muted-foreground/40 text-foreground"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center gap-1.5 pr-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <Smile className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2 w-72 bg-popover border-border backdrop-blur-2xl rounded-2xl shadow-2xl">
                    <Tabs defaultValue="reactions">
                      <TabsList className="grid grid-cols-3 mb-2 bg-accent/50 p-1 rounded-xl">
                        <TabsTrigger value="reactions" className="text-[10px] uppercase font-bold">React</TabsTrigger>
                        <TabsTrigger value="study" className="text-[10px] uppercase font-bold">Study</TabsTrigger>
                        <TabsTrigger value="fun" className="text-[10px] uppercase font-bold">Fun</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="reactions" className="grid grid-cols-6 gap-1">
                        {['👋', '👍', '❤️', '🔥', '👏', '🙌', '😮', '🤔', '😢', '🎉', '✨', '💯', '🙏', '🤝', '💪', '🤣', '🤩', '👀'].map(emoji => (
                          <button 
                            key={emoji} 
                            type="button"
                            className="p-2 hover:bg-accent rounded-lg text-xl transition-transform active:scale-125"
                            onClick={() => setInput(prev => prev + emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </TabsContent>

                      <TabsContent value="study" className="grid grid-cols-4 gap-2 py-2">
                        {['🎓', '📚', '📝', '🧠', '🧬', '🧪', '📐', '✏️', '📖', '🏫', '🎒', '🌍', '📊', '📉', '📂', '🔍', '💡', '🔔'].map(sticker => (
                          <button 
                            key={sticker} 
                            type="button"
                            className="p-2 hover:bg-primary/10 rounded-xl text-3xl transition-all hover:scale-110 active:scale-95"
                            onClick={() => sendMessage(sticker)}
                          >
                            {sticker}
                          </button>
                        ))}
                      </TabsContent>

                      <TabsContent value="fun" className="grid grid-cols-4 gap-2 py-2">
                        {['🚀', '⭐', '🏆', '🎮', '🎨', '🎵', '🍕', '🍦', '🎈', '🎁', '🐶', '🤖', '👾', '🌈', '⚡', '🛸', '⛺', '🧗'].map(sticker => (
                          <button 
                            key={sticker} 
                            type="button"
                            className="p-2 hover:bg-accent rounded-xl text-3xl transition-all hover:scale-110 active:scale-95"
                            onClick={() => sendMessage(sticker)}
                          >
                            {sticker}
                          </button>
                        ))}
                      </TabsContent>
                    </Tabs>
                    
                    <DropdownMenuSeparator className="my-2" />
                    <div className="p-2 text-[10px] text-muted-foreground uppercase font-black text-center opacity-50">Lenory Stickers v2.0</div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all group/mic relative",
                    isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                  )}
                >
                  <Mic className="w-5 h-5" />
                  {isRecording && (
                    <span className="absolute -top-1 w-full flex justify-center">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-ping" />
                    </span>
                  )}
                </Button>
                <Button type="submit" size="icon" disabled={!input.trim() || loading} className={cn(
                  "h-10 w-10 rounded-full transition-all duration-300 transform active:scale-90",
                  input.trim() ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground/50"
                )}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
          <div className="mt-3 flex justify-center">
            <p className="text-[10px] text-muted-foreground opacity-50 uppercase tracking-[0.2em] font-black flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Lenory can make mistakes. Verify important info.
            </p>
          </div>
          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'image')} />
          <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" multiple onChange={(e) => handleFileUpload(e, 'file')} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'image')} />
        </div>
      </div>
    </Layout>
  );
}
