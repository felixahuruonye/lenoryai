import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Mail, 
  Fingerprint, 
  Chrome, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<'login' | 'signup' | 'confirm' | 'id-login'>('login');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lenoryId, setLenoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setActiveSession(session);
    });
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else {
      toast.success("Welcome back to Lenory!");
      setLocation("/");
    }
    setLoading(false);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        if (data.session) {
          toast.success("Account created successfully!");
          setLocation("/");
        } else {
          toast.success("Check your email for the verification link.");
          setView('confirm');
        }
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        toast.error("Network error: Please ensure your Supabase URL and Key are correctly configured in Settings.");
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Real implementation would use a custom function or admin API to find email by LEN-XXXXXX
    toast.info("Lenory ID login is being verified...");
    setTimeout(() => {
      toast.error("Account verification failed. Please use email for now.");
      setLoading(false);
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) toast.error(error.message);
  };

  if (activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <Card className="max-w-md w-full p-8 bg-card/50 border-border backdrop-blur-2xl text-center space-y-6 relative z-10 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center border-2 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Active Session Detected</h2>
            <p className="text-muted-foreground mt-2">You are already signed in as <br /><span className="text-foreground font-semibold">{activeSession.user.email}</span></p>
          </div>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl group transition-all"
            onClick={() => setLocation("/")}
          >
            Continue to Lenory
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] font-black"
          >
            Switch Account
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent italic transform -skew-x-6">
            Lenory
          </h1>
          <p className="text-muted-foreground font-medium tracking-wide">The Future of Education is Voice-First.</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 bg-card/50 border-border backdrop-blur-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50" />
              
              {view === 'login' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input 
                        type="email" 
                        placeholder="name@example.com"
                        className="bg-accent/50 border-border pl-10 h-12 rounded-xl focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="bg-accent/50 border-border h-12 rounded-xl focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={loading} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              )}

              {view === 'signup' && (
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Full Name</Label>
                    <Input 
                      placeholder="John Doe"
                      className="bg-accent/50 border-border h-12 rounded-xl focus:ring-primary/50 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      className="bg-accent/50 border-border h-12 rounded-xl focus:ring-primary/50 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Min. 8 characters"
                      className="bg-accent/50 border-border h-12 rounded-xl focus:ring-primary/50 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={loading} 
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                  </Button>
                  <button 
                    type="button"
                    onClick={() => setView('login')}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] font-black"
                  >
                    Back to Login
                  </button>
                </form>
              )}

              {view === 'confirm' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Check your email</h3>
                    <p className="text-sm text-muted-foreground">We've sent a verification link to {email}. Please confirm your account to continue.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-border"
                    onClick={() => setView('login')}
                  >
                    Back to Login
                  </Button>
                </div>
              )}

              {view === 'id-login' && (
                <form onSubmit={handleIdLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/70">Lenory ID</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input 
                        placeholder="LEN-XXXXXX"
                        className="bg-accent/50 border-border pl-10 h-12 rounded-xl font-mono uppercase focus:ring-primary/50 placeholder:text-muted-foreground/30"
                        value={lenoryId}
                        onChange={(e) => setLenoryId(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 text-center italic">Your unique 6-character ID found in settings.</p>
                  </div>
                  <Button 
                    type="submit"
                    disabled={loading} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                  </Button>
                </form>
              )}

              {view === 'login' && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black"><span className="bg-background px-3 text-muted-foreground/50">Or continue with</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="border-border bg-accent/30 h-12 rounded-xl hover:bg-accent/50 transition-all font-bold gap-2"
                      onClick={handleGoogleLogin}
                    >
                      <Chrome className="w-4 h-4 text-orange-500" />
                      Google
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-border bg-accent/30 h-12 rounded-xl hover:bg-accent/50 transition-all font-bold gap-2"
                      onClick={() => setView('id-login')}
                    >
                      <Fingerprint className="w-4 h-4 text-primary" />
                      ID
                    </Button>
                  </div>

                  <p className="text-center text-sm text-muted-foreground font-medium pt-4">
                    New to Lenory?{" "}
                    <button 
                      onClick={() => setView('signup')}
                      className="text-primary hover:underline font-bold decoration-2 underline-offset-4"
                    >
                      Create Account
                    </button>
                  </p>
                </>
              )}

              {view === 'id-login' && (
                <button 
                  onClick={() => setView('login')}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] font-black pt-4"
                >
                  Back to Login
                </button>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-4 px-4 opacity-40">
          {['Secure', 'Encrypted', 'Futuristic'].map((text) => (
            <div key={text} className="flex flex-col items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground whitespace-nowrap">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
