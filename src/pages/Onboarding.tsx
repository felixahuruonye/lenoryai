import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  Sparkles, 
  ArrowRight, 
  GraduationCap, 
  Target, 
  Zap, 
  MessageSquare,
  Globe,
  Loader2,
  User as UserIcon,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STEPS = [
  {
    id: 'intro',
    title: 'Initialize System',
    description: 'Welcome to LENORY. Let\'s light up your potential.',
    icon: Brain
  },
  {
    id: 'identity',
    title: 'Core Identity',
    description: 'How will you be using LENORY\'s intelligence?',
    icon: UserIcon
  },
  {
    id: 'academic',
    title: 'Context Profile',
    description: 'What is your primary focus area right now?',
    icon: GraduationCap
  },
  {
    id: 'goals',
    title: 'Strategic Goals',
    description: 'What is your primary target for this period?',
    icon: Target
  },
  {
    id: 'learning',
    title: 'AI Synthesis',
    description: 'How should Lenory communicate with you?',
    icon: MessageSquare
  }
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    subject: "",
    exam_type: "JAMB",
    goal: "",
    style: "simple",
    language: "English",
    role: "student" as "student" | "business"
  });

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      complete();
    }
  };

  const complete = async () => {
    if (!user) return;
    setLoading(true);
    const toastId = toast.loading("Synthesizing your profile...");

    try {
      // 1. Update Profile (Prefer update as row should exist from trigger)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_data: data,
          preferences: {
             ...user.preferences,
             communication_style: data.style,
             language: data.language
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn("Update failed, attempting upsert as fallback:", profileError);
        // Fallback to upsert if update failed for some reason
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.name,
            onboarding_completed: true,
            onboarding_data: data,
            preferences: {
               ...user.preferences,
               communication_style: data.style,
               language: data.language
            },
            updated_at: new Date().toISOString()
          });
        
        if (upsertError) throw upsertError;
      }

      // 2. Create Memories
      const memories = [
        {
          user_id: user.id,
          title: "Primary Subject",
          content: `User is focusing on ${data.subject} (${data.exam_type})`,
          category: "Academic",
          importance: 5
        },
        {
          user_id: user.id,
          title: "Quarterly Goal",
          content: data.goal,
          category: "Insight",
          importance: 4
        },
        {
          user_id: user.id,
          title: "AI Response Style",
          content: `Preferred style: ${data.style}. Language: ${data.language}`,
          category: "Preference",
          importance: 3
        }
      ];

      const { error: memoryError } = await supabase
        .from('memories')
        .insert(memories);

      if (memoryError) throw memoryError;

      // 3. Sync profile state and redirect immediately
      await refreshProfile();
      toast.success("Intelligence Synthesis Complete!", { id: toastId });
      
      // Use setLocation for immediate response
      setLocation("/dashboard");
      setLoading(false);
      
      // Fallback to hard redirect only if it doesn't navigate within 1s
      setTimeout(() => {
        if (window.location.pathname !== "/dashboard") {
          window.location.href = "/dashboard";
        }
      }, 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message, { id: toastId });
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      
      await refreshProfile();
      setLocation("/dashboard");
    } catch (err) {
      console.error(err);
      setLocation("/dashboard"); // Redirect anyway
    } finally {
      setLoading(false);
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-xl w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -20 }}
            transition={{ duration: 0.5, ease: "circOut" }}
          >
            <Card className="p-10 bg-black/40 border-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
               
               <div className="space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                        <Icon className="w-8 h-8 text-cyan-400" />
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20 mb-1">Step {currentStep + 1} of {STEPS.length}</div>
                        <div className="flex gap-1 justify-end">
                           {STEPS.map((_, i) => (
                              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'w-4 bg-cyan-500' : 'w-2 bg-white/10'}`} />
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <h2 className="text-4xl font-bold tracking-tight italic -skew-x-3">{step.title}</h2>
                     <p className="text-white/40">{step.description}</p>
                  </div>

                  <div className="space-y-6 pt-4">
                     {currentStep === 0 && (
                        <div className="py-8 text-center space-y-6">
                           <div className="relative inline-block">
                              <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse" />
                              <p className="relative text-xl text-white/80 font-medium leading-relaxed">
                                 "Greetings, <span className="text-cyan-400 font-black tracking-tight">{user?.name}</span>. I have successfully initialized your neural bridge. I am <span className="text-white font-black italic">LENORY</span> — your hyper-adaptive intelligence partner."
                              </p>
                           </div>
                           <p className="text-sm text-white/40 max-w-sm mx-auto">
                              To serve you with precision, I need to understand whether you are here to master academia or dominate the business landscape.
                           </p>
                           <div className="flex justify-center gap-12 pt-4">
                              <div className="text-center">
                                 <div className="text-2xl font-black text-white italic">24/7</div>
                                 <div className="text-[8px] uppercase tracking-widest text-white/20">Uptime</div>
                              </div>
                              <div className="text-center">
                                 <div className="text-2xl font-black text-white italic">0.2s</div>
                                 <div className="text-[8px] uppercase tracking-widest text-white/20">Latency</div>
                              </div>
                              <div className="text-center">
                                 <div className="text-2xl font-black text-white italic">AES</div>
                                 <div className="text-[8px] uppercase tracking-widest text-white/20">Encrypted</div>
                              </div>
                           </div>
                        </div>
                     )}

                     {currentStep === 1 && (
                        <div className="space-y-4">
                           <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Your Primary Role</Label>
                           <div className="grid grid-cols-1 gap-4">
                              <button
                                 onClick={() => setData({...data, role: 'student'})}
                                 className={`p-6 rounded-[2rem] text-left transition-all border flex items-center gap-4 ${data.role === 'student' ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.1)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                              >
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.role === 'student' ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>
                                    <UserIcon className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-lg">Academic/Student</div>
                                    <p className="text-xs opacity-60">Focus on exams, study paths, and learning.</p>
                                 </div>
                              </button>
                              <button
                                 onClick={() => setData({...data, role: 'business'})}
                                 className={`p-6 rounded-[2rem] text-left transition-all border flex items-center gap-4 ${data.role === 'business' ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                              >
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.role === 'business' ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}>
                                    <Briefcase className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-lg">Business Owner/Professional</div>
                                    <p className="text-xs opacity-60">Focus on productivity, strategy, and growth.</p>
                                 </div>
                              </button>
                           </div>
                        </div>
                     )}

                     {currentStep === 2 && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Primary {data.role === 'student' ? 'Subject' : 'Domain'}</Label>
                              <Input 
                                 placeholder={data.role === 'student' ? "e.g. Physics, Law, Medicine..." : "e.g. Marketing, FinTech, Real Estate..."}
                                 className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-cyan-500/50"
                                 value={data.subject}
                                 onChange={(e) => setData({...data, subject: e.target.value})}
                              />
                           </div>
                           {data.role === 'student' && (
                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Academic Track</Label>
                                 <div className="grid grid-cols-2 gap-3">
                                    {['JAMB', 'WAEC', 'NECO', 'UNIVERSITY'].map((type) => (
                                       <button
                                          key={type}
                                          onClick={() => setData({...data, exam_type: type})}
                                          className={`h-12 rounded-xl text-xs font-bold transition-all border ${data.exam_type === type ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                       >
                                          {type}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                           {data.role === 'business' && (
                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Business Stage</Label>
                                 <div className="grid grid-cols-2 gap-3">
                                    {['STARTUP', 'SOLOPRENEUR', 'ESTABLISHED', 'INVESTOR'].map((type) => (
                                       <button
                                          key={type}
                                          onClick={() => setData({...data, exam_type: type})}
                                          className={`h-12 rounded-xl text-xs font-bold transition-all border ${data.exam_type === type ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                       >
                                          {type}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {currentStep === 3 && (
                        <div className="space-y-4">
                           <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Mission Objective</Label>
                           <textarea 
                              placeholder={data.role === 'student' ? "Describe your current goal (e.g. Score 340+ in JAMB, Understand Quantum Mechanics...)" : "Describe your current goal (e.g. Scale revenue by 20%, Automate customer service...)"}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px] focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium placeholder:text-white/10"
                              value={data.goal}
                              onChange={(e) => setData({...data, goal: e.target.value})}
                           />
                        </div>
                     )}

                     {currentStep === 4 && (
                        <div className="space-y-6">
                           <div className="space-y-3">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Communication Mode</Label>
                              <div className="grid grid-cols-3 gap-3">
                                 {['simple', 'professional', 'technical'].map((s) => (
                                    <button
                                       key={s}
                                       onClick={() => setData({...data, style: s as any})}
                                       className={`h-10 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all border ${data.style === s ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                       {s}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-white/30">Native Language Protocol</Label>
                              <div className="grid grid-cols-2 gap-3">
                                 {['English', 'Pidgin', 'Hausa', 'Igbo', 'Yoruba'].map((l) => (
                                    <button
                                       key={l}
                                       onClick={() => setData({...data, language: l as any})}
                                       className={`h-10 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all border ${data.language === l ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                       {l}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="pt-8 flex items-center justify-between gap-4">
                     {currentStep > 0 && (
                        <Button 
                           variant="ghost" 
                           className="font-black uppercase tracking-widest text-white/20 hover:text-white"
                           onClick={() => setCurrentStep(prev => prev - 1)}
                        >
                           Previous
                        </Button>
                     )}
                     <Button 
                        disabled={loading}
                        className={`font-black h-14 rounded-2xl shadow-xl transition-all active:scale-95 gap-3 ${currentStep === 0 ? 'w-full' : 'px-10 ml-auto'} ${currentStep === STEPS.length - 1 ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'}`}
                        onClick={next}
                     >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                           <>
                              {currentStep === STEPS.length - 1 ? "Initialize AI Core" : (currentStep === 0 ? "Begin Synchronicity" : "Next Phase")}
                              <ArrowRight className="w-5 h-5" />
                           </>
                        )}
                     </Button>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <Button 
                       variant="ghost" 
                       size="sm"
                       disabled={loading}
                       className="text-white/20 hover:text-white font-bold text-[10px] uppercase tracking-widest h-8"
                       onClick={handleSkip}
                    >
                       {loading ? "Synchronizing..." : "Skip to Dashboard"}
                    </Button>
                  </div>
               </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
