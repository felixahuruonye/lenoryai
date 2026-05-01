import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Sparkles, 
  Brain, 
  Mic2, 
  Zap,
  Github
} from "lucide-react";
import { motion } from "motion/react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px]">
              <div className="w-full h-full rounded-[9px] bg-black flex items-center justify-center">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tighter italic -skew-x-6">Lenory</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Capabilities</a>
            <a href="#about" className="hover:text-cyan-400 transition-colors">Our Vision</a>
            <a href="#community" className="hover:text-cyan-400 transition-colors">Network</a>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="font-bold hover:text-cyan-400"
              onClick={() => setLocation("/auth")}
            >
              Sign In
            </Button>
            <Button 
              className="bg-white text-black hover:bg-white/90 font-bold px-6 rounded-full hidden sm:flex"
              onClick={() => setLocation("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">
              <Sparkles className="w-3 h-3" />
              Next-Gen Learning Engine
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight italic">
              UNLEASH THE <span className="text-cyan-500">VOICE</span> OF <br />
              ACADEMIC <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">EXCELLENCE.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/40 max-w-2xl mx-auto font-medium">
              The world's first voice-first educational platform. Personalized paths, immersive AI chat, and intelligent exam simulations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-black h-16 px-10 rounded-2xl text-xl shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all hover:scale-105 active:scale-95 gap-3"
              onClick={() => setLocation("/auth")}
            >
              Start Learning Now
              <ArrowRight className="w-6 h-6" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-16 px-10 rounded-2xl text-xl font-bold border-white/10 bg-white/5 hover:bg-white/10 gap-3"
            >
              <Mic2 className="w-5 h-5 text-cyan-400" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Interactive Interface Preview */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="pt-12"
          >
            <div className="relative mx-auto max-w-4xl rounded-[2.5rem] p-1 bg-gradient-to-b from-white/20 to-transparent">
              <div className="bg-[#0A0A0A] rounded-[2.3rem] overflow-hidden shadow-2xl border border-white/5">
                <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-6 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="mx-auto bg-white/5 px-4 py-1 rounded-full text-[10px] font-mono text-white/30 tracking-widest uppercase">
                    secure.lenory.ai/academic-path
                  </div>
                </div>
                <div className="p-8 aspect-video bg-gradient-to-br from-cyan-900/10 to-blue-900/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="border border-white/5" />
                    ))}
                  </div>
                  <div className="text-center space-y-6 relative z-10 w-full max-w-md">
                     <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 mx-auto flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                        <Zap className="w-10 h-10 text-cyan-400" />
                     </div>
                     <div className="space-y-2">
                        <div className="h-4 w-48 bg-white/10 rounded-full mx-auto" />
                        <div className="h-4 w-32 bg-white/5 rounded-full mx-auto" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="h-12 bg-white/5 rounded-xl border border-white/10" />
                        <div className="h-12 bg-white/5 rounded-xl border border-white/10" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Trust Badges / Stats */}
      <section className="py-20 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Active Students", value: "10K+" },
              { label: "AI Interactions", value: "2.4M" },
              { label: "Subjects Covered", value: "150+" },
              { label: "Success Rate", value: "98%" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-white/30 font-bold uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <span className="font-black italic -skew-x-6 tracking-tighter">Lenory</span>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-white/30">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Press</a>
          </div>
          <div className="flex items-center gap-4">
             <Github className="w-5 h-5 text-white/20 hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
        <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-[0.4em] mt-8">
          &copy; 2026 Lenory AI Systems. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
