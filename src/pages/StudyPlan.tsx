import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Clock, 
  Target,
  CheckCircle2,
  ListTodo,
  Loader2,
  Brain
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AIService } from "@/services/aiService";

interface StudyTask {
  text: string;
  subject: string;
  completed: boolean;
}

interface PlanDay {
  day: number;
  topics: string[];
  tasks: StudyTask[];
}

interface PlanData {
  title: string;
  description: string;
  days: PlanDay[];
}

export default function StudyPlan() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActivePlan();
    }
  }, [user]);

  const fetchActivePlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setActivePlan(data);
        setSelectedDay(data.current_day || 1);
      }
    } catch (error) {
      console.error("Fetch plan error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!user) {
      toast.error("Please sign in to generate a personalized study plan.");
      return;
    }
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      toast.error("AI Configuration Missing: Please set your GEMINI_API_KEY in the Settings menu to use this feature.", {
        duration: 5000
      });
      return;
    }

    setGenerating(true);
    const toastId = toast.loading("Lenory AI is architecting your 30-day success roadmap...");
    try {
      const prompt = `You are a world-class educational strategist. Create a highly detailed, day-by-day study plan for a student preparing for a major exam in Nigeria.
      
      Student Goal: JAMB Score of 300+
      Subjects: Mathematics, English, Physics, Chemistry
      Duration: 30 days
      
      Data Structure:
      Return a JSON object:
      {
        "title": "Study Plan Name",
        "description": "Brief overview of the strategy",
        "days": [
          {
            "day": 1,
            "topics": ["Calculus", "Force"],
            "tasks": [
              { "text": "Master Chain Rule", "subject": "Math", "completed": false },
              { "text": "Solve 20 Past Questions", "subject": "Math", "completed": false }
            ]
          },
          ... up to 30 days
        ]
      }
      
      Guidelines:
      - Ensure a logical progression (foundation -> intermediate -> advanced).
      - Include rest days or review days (every 7th day).
      - Make tasks specific and actionable.
      
      Output ONLY THE JSON.`;

      const planData: PlanData = await AIService.generate(user.id, prompt, true);
      
      toast.loading("Synchronizing plan with cloud storage...", { id: toastId });

      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          title: planData.title,
          description: planData.description,
          plan: planData.days,
          current_day: 1
        })
        .select()
        .single();

      if (error) throw error;
      setActivePlan(data);
      setSelectedDay(1);
      toast.success("AI Study Plan Generated Successfully!", { id: toastId });
      
      // Deduct credits via backend (Soft check)
      fetch("/api/chat/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      }).catch(console.error);

    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Could not generate plan. Please try again.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (taskIndex: number) => {
    if (!activePlan || !activePlan.plan) return;

    const updatedPlan = [...activePlan.plan];
    const dayIndex = updatedPlan.findIndex(d => d.day === selectedDay);
    if (dayIndex === -1) return;

    // Ensure tasks exist for that day
    if (!updatedPlan[dayIndex].tasks) return;

    updatedPlan[dayIndex].tasks[taskIndex].completed = !updatedPlan[dayIndex].tasks[taskIndex].completed;

    try {
      const { error } = await supabase
        .from('study_plans')
        .update({ plan: updatedPlan })
        .eq('id', activePlan.id);

      if (error) throw error;
      setActivePlan({ ...activePlan, plan: updatedPlan });
    } catch (error) {
      console.error("Update task error:", error);
      toast.error("Failed to save progress.");
    }
  };

  const nextDay = () => {
    if (activePlan?.plan && selectedDay < activePlan.plan.length) {
      setSelectedDay(prev => prev + 1);
    }
  };

  const prevDay = () => {
    if (selectedDay > 1) {
      setSelectedDay(prev => prev - 1);
    }
  };

  const currentDayData = activePlan?.plan?.find((d: any) => d.day === selectedDay);
  const completedTasksCount = currentDayData?.tasks?.filter((t: any) => t.completed).length || 0;
  const totalTasksCount = currentDayData?.tasks?.length || 0;
  const progress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-400">
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Personalized Path</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Study Planner</h2>
              <p className="text-muted-foreground font-medium">Your 30-day roadmap to academic excellence.</p>
           </div>

           <div className="flex items-center gap-2">
              <Button 
                onClick={generatePlan}
                disabled={generating || loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11 px-6 rounded-xl gap-2 shadow-lg active:scale-95 transition-all"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {activePlan ? "Regenerate AI Plan" : "Generate AI Plan"}
              </Button>
           </div>
        </div>

        {loading && !activePlan ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-white/5 border-dashed border-2 border-white/10 rounded-[3rem]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Accessing Roadmap...</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Please wait while we synchronize your personalized study data.</p>
            </div>
          </div>
        ) : !activePlan ? (
          <Card className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-white/5 border-dashed border-2 border-white/10 rounded-[3rem]">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center">
              <Brain className="w-10 h-10 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">No Active Study Plan</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Click the button above to let Lenory AI architect your personalized 30-day success roadmap.</p>
            </div>
            <Button 
              onClick={generatePlan} 
              disabled={generating || loading} 
              className="bg-primary hover:bg-primary/90 h-12 px-8 rounded-xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Build My Plan Now
            </Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Calendar View */}
            <Card className="lg:col-span-8 p-6 bg-white/5 border-white/10 rounded-[2.5rem] backdrop-blur-md relative overflow-hidden">
              {loading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
              
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-xl font-bold">{activePlan?.title || "Loading Plan..."}</h3>
                    <p className="text-xs text-muted-foreground">{activePlan?.description}</p>
                 </div>
                 <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={prevDay}
                      disabled={selectedDay <= 1}
                      className="rounded-xl bg-white/5 hover:bg-white/10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={nextDay}
                      disabled={!activePlan?.plan || selectedDay >= activePlan.plan.length}
                      className="rounded-xl bg-white/5 hover:bg-white/10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                 </div>
              </div>

              <div className="grid grid-cols-7 gap-3">
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                   <div key={d} className="text-center text-[10px] uppercase font-black tracking-widest text-white/20 mb-2">{d}</div>
                 ))}
                 {(activePlan?.plan || []).map((d: any) => (
                   <button 
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all text-sm font-bold relative group active:scale-90",
                      d.tasks?.every((t: any) => t.completed) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      selectedDay === d.day ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]" :
                      "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"
                    )}
                   >
                     {d.day}
                     {selectedDay === d.day && (
                       <span className="absolute bottom-1 w-1 h-1 bg-black rounded-full" />
                     )}
                   </button>
                 ))}
              </div>
            </Card>

            {/* Today's Tasks */}
            <div className="lg:col-span-4 space-y-6">
               <Card className="p-6 bg-white/5 border-white/10 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold flex items-center gap-2">
                       <ListTodo className="w-5 h-5 text-cyan-400" />
                       Day {selectedDay} Tasks
                     </h3>
                     <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                       {completedTasksCount}/{totalTasksCount} Done
                     </div>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                     {(currentDayData?.tasks || []).map((task: any, i: number) => (
                       <div 
                        key={i} 
                        onClick={() => toggleTask(i)}
                        className="flex items-center gap-4 group cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
                       >
                         <div className={cn(
                           "w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0",
                           task.completed ? "bg-emerald-500 border-emerald-500 text-black" : "bg-white/5 border-white/10 group-hover:border-cyan-500"
                         )}>
                           {task.completed && <CheckCircle2 className="w-4 h-4" />}
                         </div>
                         <div className="flex-1">
                            <p className={cn("text-sm font-bold", task.completed && "text-muted-foreground line-through transition-all")}>{task.text}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">{task.subject}</p>
                         </div>
                       </div>
                     ))}
                     {(!currentDayData || (currentDayData.tasks || []).length === 0) && !loading && (
                        <div className="text-center py-8">
                           <Clock className="w-8 h-8 text-white/10 mx-auto mb-2" />
                           <p className="text-xs text-muted-foreground">No specific tasks scheduled for this day.</p>
                        </div>
                     )}
                  </div>

                  <div className="pt-6 border-t border-white/5">
                     <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                           <span>Daily Progress</span>
                           <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-white/10" />
                     </div>
                  </div>
               </Card>

               <Card className="p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-white/10 rounded-[2.5rem] space-y-4">
                  <Target className="w-8 h-8 text-blue-400" />
                  <div className="space-y-1">
                     <h4 className="font-bold">Focus Area</h4>
                     <p className="text-white/50 text-xs">
                        {currentDayData?.topics.length > 0 
                          ? `Concentrate on ${currentDayData.topics.join(', ')} today.`
                          : "Stay consistent and follow your routine."}
                     </p>
                  </div>
                  <div className="pt-2">
                     <Button variant="ghost" className="w-full text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-8 rounded-lg">
                        View Resources
                     </Button>
                  </div>
               </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
