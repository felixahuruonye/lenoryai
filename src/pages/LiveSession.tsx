import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Zap,
  Phone,
  Sparkles,
  Pencil
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Audio configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export default function LiveSession() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [status, setStatus] = useState("Ready to start session");
  const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);
  
  const isActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioOutRef = useRef<{ 
    nextTime: number; 
    queue: AudioBufferSourceNode[];
  }>({ nextTime: 0, queue: [] });

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }), []);

  // Audio Visualizer states
  const audioLevelRef = useRef(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const isTalkingRef = useRef(false);
  const silenceCounterRef = useRef(0); // For smoother VAD
  const animationFrameRef = useRef<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // PCM Conversion Helpers
  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const base64Encode = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const stopAudioOutput = useCallback(() => {
    const { queue } = audioOutRef.current;
    queue.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioOutRef.current.queue = [];
    audioOutRef.current.nextTime = audioContextRef.current?.currentTime || 0;
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
  }, []);

  const processAiAudio = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current) return;
    
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit PCM (from Gemini) to Float32 for Web Audio
    const pcmData = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32Data);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, audioOutRef.current.nextTime);
    
    source.start(startTime);
    audioOutRef.current.nextTime = startTime + buffer.duration;
    audioOutRef.current.queue.push(source);

    source.onended = () => {
      audioOutRef.current.queue = audioOutRef.current.queue.filter(s => s !== source);
      if (audioOutRef.current.queue.length === 0) {
        // Small delay to ensure all audio has cleared the buffers/air before opening mic
        setTimeout(() => {
          setIsAiSpeaking(false);
          isAiSpeakingRef.current = false;
        }, 150);
      }
    };
  }, []);

  const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      if (!isAiMuted) {
        processAiAudio(audioData);
      }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted || (message as any).serverContent?.turnComplete === false) {
      stopAudioOutput();
    }

    // Real-time transcription updates
    const msg = message as any;
    const inputTranscript = msg.serverContent?.inputAudioTranscription?.text;
    if (inputTranscript) {
       setTranscript(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === 'user' && inputTranscript.startsWith(last.text)) {
           return [...prev.slice(0, -1), { role: 'user', text: inputTranscript }];
         }
         return [...prev.slice(-15), { role: 'user', text: inputTranscript }];
       });
    }

    const outputTranscript = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
    if (outputTranscript) {
       setTranscript(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === 'model' && outputTranscript.startsWith(last.text)) {
            return [...prev.slice(0, -1), { role: 'model', text: outputTranscript }];
         }
         return [...prev.slice(-15), { role: 'model', text: outputTranscript }];
       });
    }
  }, [isAiMuted, stopAudioOutput, processAiAudio]);

  const endSession = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setStatus("Session Ended");
    
    if (liveSessionRef.current) {
      liveSessionRef.current.then((session: any) => session.close()).catch(() => {});
      liveSessionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    stopAudioOutput();

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopAudioOutput]);

  const liveSessionPtrRef = useRef<any>(null);

  const startLiveSession = async () => {
    try {
      setStatus("Booting AI Microphone...");
      setIsActive(true);
      isActiveRef.current = true;
      setTranscript([]);

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const hardwareSampleRate = audioContextRef.current.sampleRate;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        } 
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
             setStatus("Lenory is Live");
             sessionPromise.then((session) => {
               liveSessionPtrRef.current = session;
               session.sendRealtimeInput({ text: `Hi! I'm ${user?.name || 'a student'}. Start our learning session by greeting me.` });
             });
          },
          onmessage: handleLiveMessage,
          onerror: (err) => {
            console.error("Live API Error:", err);
            toast.error("Session connection lost.");
            endSession();
          },
          onclose: () => {
            if (isActiveRef.current) endSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: (gender === 'male' ? 'Fenrir' : 'Kore') as any } },
          },
          systemInstruction: "You are Lenory, a helpful Nigerian AI tutor. Your role is to have a natural voice conversation. 1. Keep responses very short (1-2 sentences). 2. Respond INSTANTLY when the user stops. 3. If the user interrupts, stop immediately. 4. Speak fast and keep the flow moving. 5. Be warm, use Nigerian slang (Oya, How far).",
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      liveSessionRef.current = sessionPromise;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      // Use 1024 or 2048 for low latency
      const processor = audioContextRef.current.createScriptProcessor(1024, 1, 1);

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        if (!isActiveRef.current || isMuted || !liveSessionPtrRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        audioLevelRef.current = rms;

        // Visual state update
        isTalkingRef.current = rms > 0.005;

        // We send audio continuously to help Gemini's VAD stay calibrated
        const ratio = hardwareSampleRate / INPUT_SAMPLE_RATE;
        const newLength = Math.floor(inputData.length / ratio);
        const pcmData = new Int16Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
          const pos = i * ratio;
          const index = Math.floor(pos);
          const fraction = pos - index;
          let val = 0;
          if (index + 1 < inputData.length) {
            val = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
          } else {
            val = inputData[index];
          }
          const s = Math.max(-1, Math.min(1, val));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        if (isActiveRef.current) {
          liveSessionPtrRef.current.sendRealtimeInput({
            audio: { data: base64Encode(pcmData.buffer), mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };


    } catch (err: any) {
      console.error("Failed to start session:", err);
      toast.error(err.message || "Microphone access denied.");
      endSession();
    }
  };

  useEffect(() => {
    const updateVisualizer = () => {
      if (isActive) {
        setAudioLevel(prev => {
          if (isAiSpeaking) return 0.2 + Math.random() * 0.8;
          const target = isTalkingRef.current ? audioLevelRef.current : 0;
          if (target > prev) return target;
          return prev * 0.92;
        });
      } else {
        setAudioLevel(0);
      }
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };
    
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    }
    
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isActive, isAiSpeaking]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (liveSessionRef.current) {
        liveSessionRef.current.then((s: any) => s.close()).catch(() => {});
      }
    };
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col pt-4">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between mb-8 px-4">
           <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isActive ? "bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "bg-white/5 border border-white/10"
              )}>
                 <Phone className={cn("w-6 h-6 transition-colors", isActive ? "text-black" : "text-white/40")} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Live Learning</h2>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500 animate-pulse" : "bg-white/10")} />
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">{status}</p>
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-white/30 hover:text-white rounded-xl bg-white/5 border border-white/5"
                onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
              >
                 <Pencil className="w-4 h-4" />
              </Button>
           </div>
        </div>

        {/* Gemini Live Inspired Visualization */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-4">
            <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
            
            <div className="relative flex items-center justify-center mb-12">
                <div className={cn(
                  "absolute inset-0 border-2 border-cyan-500/20 rounded-full transition-transform duration-300 scale-[1.5]",
                  isActive && "animate-ping opacity-20"
                )} />
                
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border border-white/10 p-2 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-black via-cyan-950/20 to-black relative flex items-center justify-center">
                        <div className="flex items-center gap-1.5 h-32 w-full justify-center px-4">
                           {[...Array(isActive ? 12 : 1)].map((_, i) => (
                             <div 
                               key={i} 
                               className={cn(
                                 "w-1.5 rounded-full transition-all duration-150 preserve-3d",
                                 isActive ? "bg-cyan-400" : "bg-white/10 h-1"
                               )}
                               style={{ 
                                 height: isActive ? `${20 + (audioLevel * (30 + Math.random() * 70))}%` : '4px',
                                 opacity: isActive ? (0.4 + (audioLevel * 0.6)) : 0.2,
                                 transitionDelay: `${i * 0.05}s`
                               }}
                             />
                           ))}
                           {!isActive && <Sparkles className="w-8 h-8 text-white/10" />}
                        </div>
                    </div>
                </div>

                <div className="absolute -bottom-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-1 rounded-full flex items-center gap-2">
                   <Zap className={cn("w-3 h-3", isActive ? "text-cyan-400" : "text-white/20")} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Lenory Live AI Mic</span>
                </div>
            </div>

            <div className="text-center space-y-4 max-w-md">
                <h3 className="text-3xl font-black tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                  {isActive ? (isAiSpeaking ? "Lenory is speaking..." : "Listening to you...") : "AI-Powered Learning"}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed font-medium">
                  {isActive 
                    ? "This is an AI-powered voice session. No browser speech recognition. Pure neural audio processing for real-time natural flow." 
                    : "Experience the next level of AI interaction. Low-latency, uninterrupted conversation using the Gemini Live API."}
                </p>
            </div>
        </div>

        {/* Global Controls */}
        <div className="pb-8 px-4 flex flex-col gap-4">
            {isActive && transcript.length > 0 && (
              <div className="max-h-24 overflow-y-auto bg-white/5 border border-white/5 rounded-2xl p-4 mb-4 custom-scrollbar">
                  {transcript.map((t, i) => (
                    <p key={i} className={cn(
                      "text-[10px] font-medium leading-loose mb-1",
                      t.role === 'user' ? "text-cyan-400/80" : "text-white/40"
                    )}>
                      {t.role === 'user' ? 'You: ' : 'Lenory: '}{t.text}
                    </p>
                  ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-all",
                    isMuted && "bg-red-500/10 border-red-500/20"
                  )}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-white/40" />}
                </Button>

                {!isActive ? (
                  <Button 
                    className="col-span-2 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg gap-3 shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all active:scale-95"
                    onClick={startLiveSession}
                  >
                    <Phone className="w-5 h-5" /> Live Start
                  </Button>
                ) : (
                  <Button 
                    className="col-span-2 h-14 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-lg gap-3 transition-all active:scale-95"
                    onClick={endSession}
                  >
                    <PhoneOff className="w-5 h-5" /> End Session
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className={cn(
                    "h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-all",
                    isAiMuted && "bg-red-500/10 border-red-500/20"
                  )}
                  onClick={() => setIsAiMuted(!isAiMuted)}
                >
                  {isAiMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-white/40" />}
                </Button>
            </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .preserve-3d { transform-style: preserve-3d; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        `}} />
      </div>
    </Layout>
  );
}
