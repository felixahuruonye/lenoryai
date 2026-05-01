import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { 
  Plus, 
  HelpCircle, 
  History, 
  BookOpen, 
  Flame, 
  Award, 
  TrendingUp,
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
  Search,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [greeting, setGreeting] = useState("");
  const [search, setSearch] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [stats, setStats] = useState({
    exams: 0,
    plans: 0,
    lessons: 0,
    avgScore: 0,
    weakTopics: [] as string[]
  });

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        const { data: exams } = await supabase.from('exams').select('*').eq('user_id', user.id);
        const { data: memories } = await supabase.from('memories').select('*').eq('user_id', user.id);
        
        const avg = exams && exams.length > 0 
          ? Math.round(exams.reduce((acc, curr) => acc + curr.score, 0) / exams.length) 
          : 0;

        // Simple heuristic for weak topics based on score
        const weak = exams 
          ?.filter(e => e.score < 50)
          .map(e => e.subject)
          .slice(0, 3) || [];

        setStats({
          exams: exams?.length || 0,
          plans: 1, // Default till we have a table
          lessons: memories?.filter(m => m.category === 'lesson')?.length || 0,
          avgScore: avg,
          weakTopics: weak.length > 0 ? weak : ["No weak topics yet!"]
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    fetchStats();
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning 👋");
    else if (hour < 17) setGreeting("Good afternoon 👋");
    else setGreeting("Good evening 👋");
  }, []);

  const handleClaim = async () => {
    if (!user || claimed) return;
    
    setClaiming(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits: (user.credits || 0) + 10,
          xp: (user.xp || 0) + 50,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setClaimed(true);
      toast.success("Reward Claimed!", {
        description: "You've received 10 messaging credits and 50 XP. Keep it up!",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
    } catch (error: any) {
      toast.error("Failed to claim reward", {
        description: error.message
      });
    } finally {
      setClaiming(false);
    }
  };

  const progressStats = [
    { label: "Exams Taken", value: stats.exams, icon: BookOpen, color: "text-purple-500", path: "/exams" },
    { label: "AI Lessons", value: stats.lessons, icon: FileText, color: "text-cyan-500", path: "/chat" },
    { label: "Study Plans", value: stats.plans, icon: TrendingUp, color: "text-emerald-500", path: "/study-plan" },
    { label: "Avg Score", value: `${stats.avgScore}%`, icon: History, color: "text-blue-500", path: "/exams" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xl text-muted-foreground font-medium">{greeting}</p>
            <h2 className="text-4xl font-bold tracking-tight mt-1">
              Welcome back, <span className="text-primary">{user?.name?.split(' ')[0] || "Scholar"}!</span>
            </h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Check your personalized learning insights and progress below.
            </p>
          </div>

          <Card className="p-4 bg-card/50 backdrop-blur-md flex items-center gap-6 min-w-[240px]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Credits</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-mono font-bold text-primary">{user?.credits || 0}</span>
                <span className="text-muted-foreground/50 text-sm font-medium">Available</span>
              </div>
            </div>
            <Button 
               onClick={() => setLocation("/memory")}
               variant="outline"
               className="rounded-xl border-dashed border-primary/30 ml-auto"
            >
              Memory System
            </Button>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {progressStats.map((stat) => (
            <Link key={stat.label} href={stat.path}>
              <Card 
                className="p-4 bg-card/40 border-border hover:bg-accent/50 transition-all group flex flex-col gap-3 relative overflow-hidden cursor-pointer"
              >
                <div className={cn("p-2 rounded-lg bg-current/10 w-fit", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{stat.label}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Insights Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-6 bg-card/40 border-border backdrop-blur-md space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Learning Analysis & Goals
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Weak Topics</p>
                <div className="flex flex-wrap gap-2">
                  {stats.weakTopics.map((topic, i) => (
                    <span key={topic} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold border border-rose-500/20">
                      {topic}
                    </span>
                  ))}
                </div>
                <Button variant="secondary" className="w-full rounded-xl gap-2 active:scale-95 transition-transform" onClick={() => setLocation("/exams")}>
                  Practice These Now
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Goal Tracking</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">JAMB target: 300+</span>
                    <span className="text-primary font-bold">{stats.avgScore}% Mastery</span>
                  </div>
                  <Progress value={stats.avgScore} className="h-2 bg-accent" />
                  <p className="text-[10px] text-muted-foreground">Based on your latest CBT performance metrics.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Academic History</p>
              <div className="space-y-3">
                {stats.exams > 0 ? (
                  <p className="text-xs text-muted-foreground italic">You have completed {stats.exams} exam protocols. Your history is recorded in the neural core.</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No academic records found. Start an exam to see your history.</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-blue-500/10 border-border text-center space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-primary blur-[20px] opacity-20" />
                <div className="relative w-full h-full rounded-full border-4 border-primary flex items-center justify-center font-bold text-2xl bg-card">
                  {user?.level || 1}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold">Level {user?.level || 1} Scholar</h4>
                <p className="text-sm text-muted-foreground">{user?.xp || 0} XP earned</p>
              </div>
              <Progress value={((user?.xp || 0) % 1000) / 10} className="h-1.5" />
            </div>
            
            <Button 
               disabled={claiming || claimed}
               onClick={handleClaim}
               className="w-full rounded-xl h-12 font-bold"
            >
              {claimed ? "Reward Claimed" : "Claim Daily Bonus"}
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
