import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { motion } from "motion/react";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Exams from "./pages/Exams";
import StudyPlan from "./pages/StudyPlan";
import Memory from "./pages/Memory";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import WebsiteGen from "./pages/WebsiteGen";
import LiveSession from "./pages/LiveSession";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

import { isSupabaseConfigured } from "./lib/supabase";

function LoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] gap-6 text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500 blur-[80px] opacity-20 animate-pulse" />
        <div className="relative z-10 w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-2xl">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      </div>
      
      <div className="text-center space-y-2 relative z-10">
        <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Initializing Lenory Core</p>
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-medium">Synchronizing Neural Pathways...</p>
      </div>
      
      {showRetry && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 mt-8"
        >
          <p className="text-white/40 text-xs text-center max-w-xs">Connecting to the matrix is taking longer than expected.</p>
          <Button 
            variant="outline" 
            size="sm"
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-[10px] h-10 px-6"
            onClick={() => window.location.reload()}
          >
            Manual Override (Refresh)
          </Button>
        </motion.div>
      )}

      {!isSupabaseConfigured && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-md text-center mx-6">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Configuration Required</p>
          <p className="text-white/60 text-sm italic">
            Check your project settings. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly set.
          </p>
        </div>
      )}
    </div>
  );
}

function Root() {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Landing />;
  
  if (user.onboarding_completed) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Onboarding />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground selection:bg-cyan-500/30">
              <Switch>
                <Route path="/auth" component={Auth} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/" component={Root} />
                <Route path="/chat" component={Chat} />
                <Route path="/exams" component={Exams} />
                <Route path="/study-plan" component={StudyPlan} />
                <Route path="/memory" component={Memory} />
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/settings" component={Settings} />
                <Route path="/website-gen" component={WebsiteGen} />
                <Route path="/live" component={LiveSession} />
                <Route>404 Not Found</Route>
              </Switch>
              <Toaster position="top-right" />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
