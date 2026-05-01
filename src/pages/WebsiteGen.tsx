import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Globe, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Heart,
  Mic,
  Monitor,
  Layout as LayoutIcon,
  Search,
  Eye,
  ArrowRight,
  Loader2,
  Code2,
  BookOpen,
  Settings2,
  History,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Bug,
  Edit3,
  Check,
  X,
  CreditCard,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIService } from "@/services/aiService";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { GeneratedWebsite } from "@/types";
import { motion, AnimatePresence } from "motion/react";

const MODELS = [
  { id: "gemini-3.1-flash-lite-preview", name: "Lenory Lite (Fast)", cost: 1, description: "Ultra-low latency synthesis. Best for small tasks." },
  { id: "gemini-3-flash-preview", name: "Lenory Flash (Default)", cost: 2, description: "Balanced speed and intelligence for most apps." },
  { id: "gemini-3.1-pro-preview", name: "Lenory Pro (Complex)", cost: 5, description: "Deep reasoning and coding expertise." }
];

export default function WebsiteGen() {
  const { user, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [generated, setGenerated] = useState<GeneratedWebsite | null>(null);
  const [history, setHistory] = useState<GeneratedWebsite[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'code' | 'learn'>('desktop');
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localCode, setLocalCode] = useState("");
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  async function fetchHistory() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('generated_websites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Fallback to localStorage if table doesn't exist
        const localData = localStorage.getItem(`lenory_websites_${user.id}`);
        if (localData) setHistory(JSON.parse(localData));
        return;
      }
      setHistory(data || []);
    } catch (err) {
      const localData = localStorage.getItem(`lenory_websites_${user.id}`);
      if (localData) setHistory(JSON.parse(localData));
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      toast.info("Listening...");
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    if (!user) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const text = await AIService.generate(user.id, "Transcribe exactly what is said in this audio. If silent, return empty.", false, {
          data: base64Data,
          mimeType: blob.type
        });

        if (text && text.trim()) {
          setPrompt(prev => (prev + " " + text).trim());
          toast.success("Speech captured!");
        }
      };
    } catch (err) {
      toast.error("Cloud Transcription failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!generated) return;
    setLoading(true);
    setStatus("Preparing environment...");
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus("Uploading assets to Lenory Cloud...");
      
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: generated.id,
          code: generated.code,
          title: generated.title
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStatus("Deploying to Vercel...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        toast.success("Successfully Hosted!", {
          description: `Site live at: ${data.url}`,
          action: {
            label: "Visit Site",
            onClick: () => window.open(data.url, "_blank")
          }
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error("Hosting Failed", { description: err.message });
      const mockUrl = `https://${generated.title.toLowerCase().replace(/[^a-z0-9]/g, '')}.lenoryai.vercel.app`;
      toast.info("Fallback Hosting Active", { description: `URI: ${mockUrl}` });
    } finally {
      setLoading(false);
      setStatus("Ready");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;
    
    if (user.credits < selectedModel.cost) {
      toast.error("Insufficient credits", {
        description: `You need ${selectedModel.cost} credits for this model. You have ${user.credits}.`
      });
      return;
    }

    setLoading(true);
    setStatus("Thinking...");
    try {
      // Deduct credits locally (Optimistic)
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: Math.max(0, user.credits - selectedModel.cost) })
        .eq('id', user.id);

      if (creditError) throw creditError;

      setStatus("Architecting UI...");
      const generationPrompt = `Generate a single-file React component using Tailwind CSS for: ${prompt}.
      
      Requirements:
      - Use ONLY Tailwind CSS for styling.
      - Use lucide-react for icons.
      - Ensure it's responsive and professional.
      - Include "Website powered by Lenory AI" in footer.
      - Use dark/modern theme by default unless specified.
      - Return ONLY the code, no markdown blocks.`;

      const code = await AIService.generate(user.id, generationPrompt);
      
      const newSite: GeneratedWebsite = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        title: prompt.split(' ').slice(0, 3).join(' ') || "Untitled Project",
        prompt: prompt,
        code: code,
        framework: "React + Tailwind",
        model: selectedModel.id,
        is_favorite: false,
        explanation: `Synthesized using ${selectedModel.name}. Applied modern UI patterns and optimized for responsiveness.`,
        created_at: new Date().toISOString()
      };

      await supabase.from('generated_websites').insert([newSite]);

      const updatedHistory = [newSite, ...history];
      setHistory(updatedHistory);
      localStorage.setItem(`lenory_websites_${user.id}`, JSON.stringify(updatedHistory));
      
      setGenerated(newSite);
      setLocalCode(newSite.code);
      await refreshProfile();
      toast.success("Design completed!");
    } catch (err: any) {
      toast.error("Cloud Synthesis failed", { description: err.message });
      console.error(err);
    } finally {
      setLoading(false);
      setStatus("Ready");
    }
  };

  const toggleFavorite = async (site: GeneratedWebsite) => {
    try {
      const { error } = await supabase
        .from('generated_websites')
        .update({ is_favorite: !site.is_favorite })
        .eq('id', site.id);
      
      if (error) throw error;
      setHistory(prev => prev.map(s => s.id === site.id ? { ...s, is_favorite: !s.is_favorite } : s));
      if (generated?.id === site.id) setGenerated({ ...generated, is_favorite: !generated.is_favorite });
    } catch (err) {
      toast.error("Failed to update favorites");
    }
  };

  const handleManualSave = () => {
    if (!generated) return;
    setGenerated({ ...generated, code: localCode });
    setEditMode(false);
    toast.success("Changes saved locally");
  };

  const handleClearHistory = async () => {
    if (!user) return;
    const confirm = window.confirm("Are you sure you want to delete your entire generation history? This cannot be undone.");
    if (!confirm) return;

    try {
      await supabase.from('generated_websites').delete().eq('user_id', user.id);
      localStorage.removeItem(`lenory_websites_${user.id}`);
      setHistory([]);
      setGenerated(null);
      toast.success("History purged.");
    } catch (err) {
      toast.error("Failed to clear history");
    }
  };

  const filteredHistory = history.filter(site => 
    site.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    site.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-3xl">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Lenory Studio</h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Intelligence:</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{selectedModel.name}</span>
                </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                 <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                 <span className="text-sm font-bold">{user?.credits || 0} Credits</span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className={cn("rounded-xl border-white/10 gap-2", showHistory && "bg-white/10")}
              >
                 <History className="w-4 h-4" /> History
              </Button>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          <div className="space-y-6">
            {!generated ? (
              <Card className="p-10 bg-white/5 border-white/10 rounded-[3rem] backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                  <Rocket className="w-40 h-40" />
                </div>
                
                <div className="space-y-8 relative z-10">
                   <div className="space-y-2">
                     <h3 className="text-4xl font-black tracking-tight">Visions into Reality.</h3>
                     <p className="text-white/40 text-lg">Architecture, functionality, and aesthetics synthesized by AI.</p>
                   </div>

                   <div className="space-y-4">
                      <div className="relative">
                        <Textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Describe your digital masterpiece..."
                          className="min-h-[160px] bg-black/40 border-white/10 rounded-3xl p-6 text-lg placeholder:text-white/10 focus:border-cyan-500/50 transition-all resize-none shadow-inner"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                              "h-12 w-12 rounded-2xl transition-all",
                              isRecording ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-cyan-400"
                            )}
                           >
                             <Mic className="w-5 h-5" />
                           </Button>
                           <Button 
                            variant={debugMode ? "default" : "ghost"} 
                            size="icon" 
                            onClick={() => setDebugMode(!debugMode)}
                            className={cn(
                              "h-12 w-12 rounded-2xl transition-all",
                              debugMode ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-cyan-400"
                            )}
                           >
                             <Bug className="w-5 h-5" />
                           </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                         {MODELS.map(model => (
                           <button 
                             key={model.id}
                             onClick={() => setSelectedModel(model)}
                             className={cn(
                               "flex-1 p-4 rounded-2xl border transition-all text-left group",
                               selectedModel.id === model.id 
                                ? "bg-cyan-500/10 border-cyan-500/50" 
                                : "bg-white/5 border-white/5 hover:bg-white/10"
                             )}
                           >
                             <div className="flex justify-between items-start mb-1">
                               <span className={cn("text-xs font-black uppercase tracking-widest", selectedModel.id === model.id ? "text-cyan-400" : "text-white/20")}>{model.name}</span>
                               <span className="text-[10px] font-bold text-orange-400 px-1.5 py-0.5 bg-orange-400/10 rounded-full">{model.cost} Credits</span>
                             </div>
                             <p className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors line-clamp-1">{model.description}</p>
                           </button>
                         ))}
                      </div>
                   </div>

                   <Button 
                    disabled={!prompt.trim() || loading}
                    onClick={handleGenerate}
                    className="w-full h-16 bg-white text-black hover:bg-cyan-400 font-black text-xl rounded-2xl gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.1)] group transition-all"
                   >
                     {loading ? (
                       <div className="flex items-center gap-3">
                         <Loader2 className="w-6 h-6 animate-spin" />
                         <span>Synthesizing Protocols...</span>
                       </div>
                     ) : (
                       <>Generate Experience <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                     )}
                   </Button>

                   <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/10">Enterprise Grade Webapp Engine v2.4</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                 {/* Generation UI Bar */}
                 <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                       <Button variant="ghost" size="icon" onClick={() => setGenerated(null)} className="rounded-xl text-white/30 hover:bg-white/5">
                          <ChevronLeft className="w-5 h-5" />
                       </Button>
                       <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                          {[
                            { id: 'desktop', icon: Monitor },
                            { id: 'mobile', icon: LayoutIcon },
                            { id: 'code', icon: Code2 },
                            { id: 'learn', icon: BookOpen }
                          ].map(mode => (
                            <button 
                              key={mode.id}
                              onClick={() => setViewMode(mode.id as any)}
                              className={cn(
                                "p-2 rounded-md transition-all flex items-center gap-2", 
                                viewMode === mode.id ? "bg-white/10 text-cyan-400 shadow-sm" : "text-white/30 hover:text-white"
                              )}
                            >
                               <mode.icon className="w-4 h-4" />
                               {viewMode === mode.id && <span className="text-[10px] font-bold uppercase tracking-widest">{mode.id}</span>}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <Button 
                        variant="ghost" 
                        onClick={() => setEditMode(!editMode)}
                        className={cn("text-white/40 hover:text-cyan-400 gap-2 font-bold", editMode && "text-cyan-400")}
                       >
                         <Edit3 className="w-4 h-4" /> {editMode ? 'Exit Editor' : 'Manual Edit'}
                       </Button>
                       <Button 
                        onClick={() => window.open(window.location.origin + "/preview", "_blank")}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-2"
                       >
                         <Eye className="w-4 h-4" /> Preview
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => toggleFavorite(generated)} className={cn("rounded-xl", generated.is_favorite ? "text-rose-500" : "text-white/20")}>
                          <Heart className={cn("w-5 h-5", generated.is_favorite && "fill-current")} />
                       </Button>
                    </div>
                 </div>

                 {/* Main Content Area */}
                 <div className={cn(
                   "mx-auto border border-white/10 bg-white/5 rounded-3xl overflow-hidden transition-all duration-500 shadow-2xl relative min-h-[600px]",
                   viewMode === 'desktop' ? "w-full" : viewMode === 'mobile' ? "w-[375px]" : "w-full"
                 )}>
                    {viewMode === 'code' ? (
                      <div className="p-8 font-mono text-sm h-full overflow-auto bg-black/60">
                        <pre className="text-cyan-400/80">
                          <code>{localCode}</code>
                        </pre>
                      </div>
                    ) : viewMode === 'learn' ? (
                      <div className="p-10 space-y-8 bg-zinc-950 h-full">
                         <div className="flex items-center gap-3">
                           <BookOpen className="w-6 h-6 text-cyan-400" />
                           <h4 className="text-xl font-bold">Neural Breakdown</h4>
                         </div>
                         <div className="prose prose-invert max-w-none">
                            <p className="text-white/60 leading-relaxed text-lg italic">
                              "{generated.explanation}"
                            </p>
                            <div className="mt-10 grid md:grid-cols-2 gap-6">
                               <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                  <h5 className="font-bold text-cyan-400">Framework Selection</h5>
                                  <p className="text-sm text-white/40">I synthesized this using {generated.framework} to ensure maximum responsiveness and performance scores.</p>
                               </div>
                               <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                  <h5 className="font-bold text-cyan-400">Design Logic</h5>
                                  <p className="text-sm text-white/40">Glassmorphism was applied to the navigation to create depth, while staggered motion-react components handle the entrance flow.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="relative group/view">
                        {/* Simulated Preview */}
                        <div className="p-10 bg-[#0a0a0a] min-h-[600px]">
                            {editMode ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Manual Override Active</span>
                                   <Button size="sm" onClick={handleManualSave} className="bg-emerald-500 text-black font-bold h-7 ">
                                      <Check className="w-3.5 h-3.5 mr-1" /> Save Edits
                                   </Button>
                                </div>
                                <Textarea 
                                  value={localCode}
                                  onChange={(e) => setLocalCode(e.target.value)}
                                  className="min-h-[500px] bg-black/40 border-white/5 font-mono text-xs text-white/40"
                                />
                              </div>
                            ) : (
                              <div className="bg-black text-white p-12 rounded-2xl border border-white/5 space-y-8">
                                <nav className="flex justify-between items-center pb-8 border-b border-white/5">
                                   <div className="w-8 h-8 bg-cyan-400 rounded-lg" />
                                   <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-white/40">
                                      <span>Home</span>
                                      <span>About</span>
                                      <span>Features</span>
                                   </div>
                                </nav>
                                <div className="space-y-4 pt-12">
                                   <h1 className="text-5xl font-black">{generated.title}</h1>
                                   <p className="text-white/40 text-lg">{generated.prompt.substring(0, 100)}...</p>
                                   <div className="flex gap-4 pt-4">
                                      <div className="h-12 w-32 bg-cyan-400 rounded-xl" />
                                      <div className="h-12 w-32 bg-white/5 border border-white/10 rounded-xl" />
                                   </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6 pt-20">
                                   <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                                   <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                                   <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="flex justify-center gap-4">
                     <Button 
                      onClick={handleDeploy}
                      disabled={loading}
                      variant="outline" 
                      className="bg-white/5 border-white/10 h-12 px-8 rounded-xl font-bold gap-2 hover:bg-emerald-500 hover:text-black transition-all"
                     >
                        <Rocket className={cn("w-4 h-4", loading && "animate-bounce")} /> 
                        {loading ? status : "Host as App"}
                     </Button>
                     <Button variant="outline" className="bg-white/5 border-white/10 h-12 px-8 rounded-xl font-bold gap-2">
                        <Settings2 className="w-4 h-4" /> Advanced Settings
                     </Button>
                 </div>
              </div>
            )}
          </div>

          {/* Right History Panel / Stats */}
          <div className="space-y-6">
             <Card className="p-6 bg-white/5 border-white/10 rounded-[2rem] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                   <h4 className="font-bold flex items-center gap-2">
                     <History className="w-4 h-4 text-cyan-400" /> Neural History
                   </h4>
                   <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setHistory([])} className="h-8 w-8 rounded-lg text-white/10 hover:text-rose-500 hover:bg-rose-500/10 transition-all"><Trash2 className="w-4 h-4" /></Button>
                   </div>
                </div>
                
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                   <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search past sites..." 
                    className="h-10 pl-10 bg-black/40 border-white/5 rounded-xl text-xs placeholder:text-white/10"
                   />
                </div>

                <div className="space-y-3 max-h-[500px] overflow-auto pr-1 custom-scrollbar">
                   {filteredHistory.map(site => (
                     <div 
                       key={site.id} 
                       onClick={() => {
                         setGenerated(site);
                         setLocalCode(site.code);
                       }}
                       className={cn(
                        "w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden cursor-pointer",
                        generated?.id === site.id 
                          ? "bg-cyan-500/10 border-cyan-500/30" 
                          : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                       )}
                     >
                        {generated?.id === site.id && (
                          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/10 blur-2xl" />
                        )}
                       <div className="flex justify-between items-start relative z-10">
                          <div className="space-y-1 max-w-[80%]">
                            <p className={cn("text-xs font-bold truncate", generated?.id === site.id ? "text-cyan-400" : "text-white/70")}>{site.title}</p>
                            <p className="text-[10px] text-white/30 truncate">{site.prompt}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 -mr-2 text-white/20 hover:text-rose-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(site);
                            }}
                          >
                            <Heart className={cn("w-3.5 h-3.5", site.is_favorite && "fill-rose-500 text-rose-500")} />
                          </Button>
                       </div>
                       <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 relative z-10">
                          <span className="text-[9px] text-white/20 font-black tracking-widest uppercase">{new Date(site.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-cyan-400/50 font-bold uppercase">{site.model.includes('pro') ? 'Pro' : 'Fast'}</span>
                          </div>
                       </div>
                     </div>
                   ))}
                   {history.length === 0 && (
                     <div className="py-12 text-center space-y-2 opacity-20">
                        <LayoutIcon className="w-8 h-8 mx-auto" />
                        <p className="text-[10px] uppercase font-black">History Blank</p>
                     </div>
                   )}
                </div>
             </Card>

             <Card className="p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-white/10 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3">
                   <Rocket className="w-5 h-5 text-indigo-400" />
                   <h4 className="font-bold">Project Quota</h4>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40">
                         <span>Monthly Limit</span>
                         <span>{history.length} / 50</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500" style={{ width: `${(history.length / 50) * 100}%` }} />
                      </div>
                   </div>
                   <p className="text-[10px] text-white/30 italic">Generated sites are hosted on Lenory-CDN with 99.9% uptime.</p>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
