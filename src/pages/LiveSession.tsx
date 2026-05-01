import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  User, 
  Zap,
  Phone,
  MessageSquare,
  Sparkles,
  RefreshCcw,
  UserCircle2,
  Pencil
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LiveSession() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [status, setStatus] = useState("Ready to start session");
  const [transcript, setTranscript] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const voices = {
    male: "pNInz6obpgmqMAr2W4mH", // Adam
    female: "EXAVITQu4vr4xnSDTEO8" // Bella
  };

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
        audioChunks.current = [];
        await processVoice(blob);
      };

      setIsActive(true);
      setStatus("Listening...");
      toast.success("Live AI Session synchronized.");
      speak(`Hello ${user?.name || 'Student'}, I am LENORY. I'm listening to you now.`);
      
      // Auto-recording loop logic could go here, but for now we'll trigger manually with muted state
      // or a simple interval check. Let's stick to manual for stability.
    } catch (err) {
      toast.error("Microphone access required for Live Session");
    }
  };

  const processVoice = async (blob: Blob) => {
    if (isMuted) return;
    setStatus("Transcribing...");
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result;
        const res = await fetch("/api/voice/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64Audio })
        });
        const data = await res.json();
        if (data.text) {
          setTranscript(prev => [...prev, `You: ${data.text}`]);
          await handleAiResponse(data.text);
        }
      } catch (e) {
        console.error("Transcription error:", e);
      }
    };
  };

  const handleAiResponse = async (text: string) => {
    try {
      setStatus("Thinking...");
      const response = await fetch("/api/chat", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ message: text, userId: user?.id })
      });
      const data = await response.json();
      setTranscript(prev => [...prev, `LENORY: ${data.content}`]);
      await speak(data.content);
    } catch (e) {
      console.error("AI Error:", e);
    }
  };

  const endSession = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsActive(false);
    setStatus("Session Ended");
  };

  const speak = async (text: string) => {
    if (isAiMuted) return;
    try {
      setStatus("LENORY is speaking...");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: voices[gender] })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
    } 
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                 <Zap className={cn("w-6 h-6 text-cyan-400", isActive && "animate-pulse")} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Live AI Session</h2>
                <p className="text-white/40 text-sm font-medium">{status}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white/30 hover:text-white rounded-xl">
                 <Settings className="w-5 h-5" />
              </Button>
           </div>
        </div>

        {/* Main Interface */}
        <div className="flex-1 grid md:grid-cols-2 gap-8 items-center">
            {/* AI Avatar */}
            <div className="relative group flex flex-col items-center">
                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/5 p-4 bg-white/5 backdrop-blur-3xl shadow-[0_0_100px_rgba(34,211,238,0.1)]">
                   <div className="w-full h-full rounded-full overflow-hidden border-4 border-cyan-500/50 relative">
                       {/* Mock Avatar Image/SVG */}
                       <div className="w-full h-full bg-gradient-to-tr from-[#050505] to-cyan-900/40 flex items-center justify-center">
                          <UserCircle2 className="w-40 h-40 text-cyan-400/20" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                             {isActive ? (
                                <div className="flex items-end gap-1.5 h-12">
                                   {[...Array(5)].map((_, i) => (
                                      <div key={i} className="w-2 bg-cyan-400 rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s`, height: '20%' }} />
                                   ))}
                                </div>
                             ) : (
                                <Sparkles className="w-12 h-12 text-cyan-400/40" />
                             )}
                          </div>
                       </div>
                   </div>
                   
                   <button 
                     onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
                     className="absolute top-4 right-4 p-2 bg-black/60 rounded-xl border border-white/10 hover:border-cyan-500 transition-all z-20 group/edit"
                   >
                     <Pencil className="w-4 h-4 text-white/50 group-hover/edit:text-cyan-400" />
                   </button>
                </div>

                <div className="mt-8 text-center space-y-2">
                   <h3 className="text-2xl font-bold tracking-tight">LENORY AI</h3>
                   <p className="text-cyan-400 text-xs font-black uppercase tracking-widest">{gender} Voice Optimized</p>
                </div>
            </div>

            {/* Transcript / Controls */}
            <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-3xl h-full rounded-[2.5rem] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", 
                      isActive ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/5 text-white/20"
                    )}>
                      {isActive ? "Real-time Sync" : "Offline"}
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Session Transcript</h4>
                      <p className="text-[10px] text-white/20 font-bold">Auto-transcribed via AssemblyAI</p>
                    </div>

                    <div className="space-y-4 h-[250px] overflow-y-auto no-scrollbar scroll-smooth pr-2">
                        {transcript.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-20">
                              <MessageSquare className="w-8 h-8 mx-auto" />
                              <p className="text-xs font-medium">Session logs will appear here as you speak.</p>
                           </div>
                        ) : (
                           transcript.map((t, i) => (
                             <div key={i} className="animate-in slide-in-from-bottom-2 duration-300 bg-white/5 p-4 rounded-2xl border border-white/5 text-sm leading-relaxed text-white/70">
                                {t}
                             </div>
                           ))
                        )}
                    </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-4">
                   <Button 
                     variant="outline" 
                     className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 gap-3"
                     onClick={() => setIsMuted(!isMuted)}
                   >
                     {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-cyan-400" />}
                     <span className="font-bold">{isMuted ? "Unmute" : "Mute self"}</span>
                   </Button>
                   <Button 
                     variant="outline" 
                     className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 gap-3"
                     onClick={() => setIsAiMuted(!isAiMuted)}
                   >
                     {isAiMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                     <span className="font-bold font-mono">{isAiMuted ? "Silence" : "Speaking"}</span>
                   </Button>
                   {!isActive ? (
                     <Button 
                       className="col-span-2 h-16 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg gap-3 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                       onClick={startSession}
                     >
                       <Phone className="w-6 h-6" /> Start Session
                     </Button>
                   ) : (
                     <Button 
                       className="col-span-2 h-16 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-lg gap-3 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                       onClick={endSession}
                     >
                       <PhoneOff className="w-6 h-6" /> Terminate Session
                     </Button>
                   )}
                </div>
            </Card>
        </div>

        {/* Hidden Audio */}
        <audio ref={audioRef} hidden onEnded={() => setStatus("Listening... (Hey Lenory)")} />
        
        {/* Wave Style */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes wave {
            0%, 100% { height: 20%; opacity: 0.5; }
            50% { height: 100%; opacity: 1; }
          }
          .animate-wave {
            animation: wave 1s infinite ease-in-out;
          }
        `}} />
      </div>
    </Layout>
  );
}
