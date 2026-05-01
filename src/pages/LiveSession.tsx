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

// Audio constants
const TARGET_INPUT_RATE = 16000;
const AI_OUTPUT_RATE = 24000;

// AudioWorklet script for low-latency PCM processing and resampling
const WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.offset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    // Simple VAD logic can be here, but we'll just send for now
    this.port.postMessage({ samples: channelData, type: 'samples' });
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);
`;

export default function LiveSession() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [status, setStatus] = useState("Ready to start session");
  const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);
  
  const isActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSessionPtrRef = useRef<any>(null);
  const audioOutRef = useRef<{ nextTime: number; queue: AudioBufferSourceNode[] }>({ nextTime: 0, queue: [] });

  // Use the standard model from the skill
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }), []);

  // Visualizer states
  const [audioLevel, setAudioLevel] = useState(0);
  const rmsRef = useRef(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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
    if (!audioContextRef.current || isAiMuted) return;
    
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      // Decoding 24kHz PCM for model output
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

      const buffer = audioContextRef.current.createBuffer(1, float32.length, AI_OUTPUT_RATE);
      buffer.getChannelData(0).set(float32);

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
          setIsAiSpeaking(false);
          isAiSpeakingRef.current = false;
        }
      };
    } catch (e) {
      console.error("AI Audio Processing Error", e);
    }
  }, [isAiMuted]);

  const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) processAiAudio(audioData);

    // Immediate Interruption Support
    if (message.serverContent?.interrupted || (message as any).serverContent?.turnComplete === false) {
      stopAudioOutput();
    }

    const msg = message as any;
    const inputTranscript = msg.serverContent?.inputAudioTranscription?.text;
    if (inputTranscript) {
       setTranscript(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === 'user' && inputTranscript.startsWith(last.text)) {
           return [...prev.slice(0, -1), { role: 'user', text: inputTranscript }];
         }
         return [...prev.slice(-10), { role: 'user', text: inputTranscript }];
       });
    }

    const outputTranscript = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
    if (outputTranscript) {
       setTranscript(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === 'model' && outputTranscript.startsWith(last.text)) {
            return [...prev.slice(0, -1), { role: 'model', text: outputTranscript }];
         }
         return [...prev.slice(-10), { role: 'model', text: outputTranscript }];
       });
    }
  }, [processAiAudio, stopAudioOutput]);

  const endSession = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setStatus("Session Ended");
    
    if (liveSessionPtrRef.current) {
      try { liveSessionPtrRef.current.close(); } catch(e){}
      liveSessionPtrRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    stopAudioOutput();

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopAudioOutput]);

  const startLiveSession = async () => {
    try {
      setStatus("Initializing...");
      setIsActive(true);
      isActiveRef.current = true;
      setTranscript([]);

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } 
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: "models/gemini-2.0-flash-exp",
        callbacks: {
          onopen: () => {
             setStatus("Lenory is Live");
             sessionPromise.then((session) => {
               liveSessionPtrRef.current = session;
               session.sendRealtimeInput({ text: `Hello! I'm ${user?.name || 'ready'}. Introduce yourself as Lenory, my Nigerian AI tutor. Speak Nigerian slang like 'Oya', 'How far?'. Keep responses under 10 words!` });
             });
          },
          onmessage: handleLiveMessage,
          onerror: (err) => {
            console.error("Gemini Error:", err);
            toast.error("Low latency connection failed. Retrying...");
            endSession();
          },
          onclose: () => { if (isActiveRef.current) endSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: (gender === 'male' ? 'Fenrir' : 'Kore') as any } },
          },
          systemInstruction: "ACT AS LENORY, A NIGERIAN AI TUTOR. 1. RESPOND INSTANTLY (MAX 10ms WAIT). 2. MAX 10 WORDS. 3. USE NIGERIAN SLANG. 4. STOP SPEAKING IF INTERRUPTED.",
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContextRef.current.audioWorklet.addModule(workletUrl);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Add a gain node to boost volume if the user is quiet
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.8; // Boost for Gemini hearing
      
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');

      const hardwareRate = audioContextRef.current.sampleRate;
      const ratio = hardwareRate / TARGET_INPUT_RATE;
      let pcmBuffer = new Int16Array(2048);
      let pcmOffset = 0;
      let lastPos = 0;

      workletNode.port.onmessage = (e) => {
        if (!isActiveRef.current || isMutedRef.current || !liveSessionPtrRef.current) return;
        
        const floatSamples = e.data.samples;
        
        // Visualizer
        let sum = 0;
        for (let i = 0; i < floatSamples.length; i++) sum += floatSamples[i] * floatSamples[i];
        rmsRef.current = Math.sqrt(sum / floatSamples.length);

        // More robust linear interpolation
        for (let i = 0; i < floatSamples.length; i++) {
          const currentPos = lastPos + i;
          const targetIndex = Math.floor(currentPos / ratio);
          const nextTargetIndex = Math.floor((currentPos + 1) / ratio);

          if (nextTargetIndex > targetIndex) {
            // Apply gain and clip
            const sample = floatSamples[i];
            const s = Math.max(-1, Math.min(1, sample));
            pcmBuffer[pcmOffset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

            if (pcmOffset >= 512) {
              const chunk = pcmBuffer.slice(0, pcmOffset);
              // Use efficient base64 conversion
              const binary = new Uint8Array(chunk.buffer);
              let binaryString = "";
              for (let j = 0; j < binary.length; j++) binaryString += String.fromCharCode(binary[j]);
              const base64 = btoa(binaryString);

              liveSessionPtrRef.current.sendRealtimeInput({
                audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
              });
              pcmOffset = 0;
            }
          }
        }
        lastPos += floatSamples.length;
      };

      source.connect(gainNode);
      gainNode.connect(workletNode);
      // Don't connect worklet to destination to avoid feedback unless requested
      source.connect(audioContextRef.current.destination).disconnect(); 

    } catch (err: any) {
      console.error("Startup Error", err);
      toast.error("Microphone or API error.");
      endSession();
    }
  };

  useEffect(() => {
    const viz = () => {
      setAudioLevel(prev => {
        if (isAiSpeaking) return 0.3 + Math.random() * 0.7;
        const target = Math.min(1, rmsRef.current * 10);
        if (target > prev) return target;
        return prev * 0.9;
      });
      if (isActive) requestAnimationFrame(viz);
    };
    if (isActive) requestAnimationFrame(viz);
  }, [isActive, isAiSpeaking]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (liveSessionPtrRef.current) liveSessionPtrRef.current.close();
    };
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col pt-4">
        <div className="flex items-center justify-between mb-8 px-4">
           <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isActive ? "bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "bg-white/5 border border-white/10"
              )}>
                 <Phone className={cn("w-6 h-6 transition-colors", isActive ? "text-black" : "text-white/40")} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-sans">Lenory Live</h2>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500 animate-pulse" : "bg-white/10")} />
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{status}</p>
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button 
                variant="ghost" size="icon" 
                className="h-10 w-10 text-white/30 hover:text-white rounded-xl bg-white/5 border border-white/5"
                onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
              >
                 <Pencil className="w-4 h-4" />
              </Button>
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-4">
            <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative flex items-center justify-center mb-12">
                <div className={cn("absolute inset-0 border-2 border-cyan-500/20 rounded-full transition-transform duration-300 scale-[1.5]", isActive && "animate-ping")} />
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border border-white/10 p-2 bg-black overflow-hidden shadow-2xl flex items-center justify-center">
                    <div className="flex items-center gap-1.5 h-32 w-full justify-center px-4">
                       {[...Array(isActive ? 12 : 1)].map((_, i) => (
                         <div key={i} className="w-1.5 rounded-full bg-cyan-400 transition-all duration-75"
                           style={{ 
                             height: isActive ? `${10 + (audioLevel * (i % 3 === 0 ? 90 : 50))}%` : '4px',
                             opacity: isActive ? 0.8 : 0.2
                           }}
                         />
                       ))}
                       {!isActive && <Sparkles className="w-8 h-8 text-white/10" />}
                    </div>
                </div>
            </div>

            <div className="text-center space-y-4">
                <h3 className="text-3xl font-black bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                  {isActive ? (isAiSpeaking ? "Lenory speaking..." : "Listening...") : "Voice Tutoring"}
                </h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-tighter">Real-time low latency mode active</p>
            </div>
        </div>

        <div className="pb-8 px-4 flex flex-col gap-4">
            {isActive && transcript.length > 0 && (
              <div className="max-h-24 overflow-y-auto bg-white/5 border border-white/5 rounded-2xl p-4 mb-2 custom-scrollbar">
                  {transcript.map((t, i) => (
                    <p key={i} className={cn("text-[10px] mb-1 font-bold", t.role === 'user' ? "text-cyan-400" : "text-white/40")}>
                      {t.role === 'user' ? '> ' : 'L: '}{t.text}
                    </p>
                  ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
                <Button variant="outline" className={cn("h-14 rounded-2xl", isMuted && "bg-red-500/20")} onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <MicOff className="w-5 text-red-500" /> : <Mic className="w-5 text-white/40" />}
                </Button>
                {!isActive ? (
                  <Button className="col-span-2 h-14 rounded-2xl bg-cyan-500 text-black font-black text-lg shadow-[0_0_40px_rgba(34,211,238,0.4)]" onClick={startLiveSession}>
                    <Phone className="w-5 mr-2" /> Start Call
                  </Button>
                ) : (
                  <Button className="col-span-2 h-14 rounded-2xl bg-red-500 text-white font-black text-lg" onClick={endSession}>
                    <PhoneOff className="w-5 mr-2" /> End Call
                  </Button>
                )}
                <Button variant="outline" className={cn("h-14 rounded-2xl", isAiMuted && "bg-red-500/20")} onClick={() => setIsAiMuted(!isAiMuted)}>
                  {isAiMuted ? <VolumeX className="w-5 text-red-500" /> : <Volume2 className="w-5 text-white/40" />}
                </Button>
            </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`}} />
      </div>
    </Layout>
  );
}
