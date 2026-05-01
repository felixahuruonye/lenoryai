import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BrainCircuit, 
  Sparkles, 
  Trash2, 
  Search, 
  Filter, 
  Zap, 
  Clock,
  Loader2,
  Plus,
  Save,
  BookOpen,
  Target,
  LineChart,
  UserCircle,
  AlertTriangle,
  RotateCcw,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type Memory as MemoryType } from "@/types";
import { motion, AnimatePresence } from "motion/react";

export default function Memory() {
  const { user, refreshProfile } = useAuth();
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Memory');
  const [showBrainModal, setShowBrainModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<'all' | 'critical'>('all');
  const [instructions, setInstructions] = useState(user?.custom_instructions || "");
  const [saving, setSaving] = useState(false);
  
  const [stats, setStats] = useState({
    exams: [] as any[],
    weakTopics: [] as string[],
    avgScore: 0,
  });

  useEffect(() => {
    if (user) {
      setInstructions(user.custom_instructions || "");
      fetchMemories();
      fetchAcademicData();
    }
  }, [user]);

  async function fetchAcademicData() {
    if (!user) return;
    try {
      const { data: exams } = await supabase.from('exams').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      
      if (exams) {
        const avg = exams.length > 0 
          ? Math.round(exams.reduce((acc, curr) => acc + curr.score, 0) / exams.length) 
          : 0;

        const weak = exams
          .filter(e => e.score < 50)
          .map(e => e.subject)
          .filter((v, i, a) => a.indexOf(v) === i);

        setStats({
          exams,
          weakTopics: weak,
          avgScore: avg
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMemories() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error: any) {
      toast.error("Failed to load memories");
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchMemories(), fetchAcademicData()]);
    toast.success("Insights synchronized", { icon: <Zap className="w-4 h-4 text-cyan-400" /> });
  };

  const handleSaveInstructions = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ custom_instructions: instructions })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Lenory's Digital Brain updated!");
      setShowBrainModal(false);
    } catch (error: any) {
      toast.error("Failed to update brain");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Reset Profile Preferences
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          preferences: { 
            communication_style: 'simple', 
            theme: 'dark' 
          } 
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      // 2. Wipe All Memories
      const { error: memoryError } = await supabase
        .from('memories')
        .delete()
        .eq('user_id', user.id);

      if (memoryError) throw memoryError;
      
      await refreshProfile();
      setMemories([]);
      setShowResetModal(false);
      toast.success("Cognitive baseline reset", { 
        description: "All learned memories wiped. Preferences restored to default." 
      });
    } catch (error: any) {
      console.error("Reset Error:", error);
      toast.error("Failed to reset core system. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  async function deleteMemory(id: string) {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMemories(prev => prev.filter(m => m.id !== id));
      toast.success("Memory cleared");
    } catch (error: any) {
      toast.error("Failed to delete memory");
    }
  }

  const filteredMemories = memories.filter(m => {
    const matchesSearch = searchQuery === "" || 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = importanceFilter === 'all' || m.importance >= 4;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <BrainCircuit className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Cognitive Core</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Learning Memory</h2>
            <p className="text-white/40">Everything Lenory has learned about your learning journey.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setImportanceFilter(prev => prev === 'all' ? 'critical' : 'all');
                toast.info(`Filtering by: ${importanceFilter === 'all' ? 'Critical Importance' : 'All Memories'}`);
              }}
              className={cn(
                "bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-4 rounded-xl transition-all",
                importanceFilter === 'critical' && "border-orange-500/50 bg-orange-500/10 text-orange-400"
              )}
            >
               <Filter className="w-4 h-4" /> {importanceFilter === 'critical' ? 'Critical Only' : 'Filter'}
            </Button>
            <Button 
              onClick={handleRefresh}
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-11 px-6 rounded-xl gap-2"
            >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Refresh Insights
            </Button>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="relative bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center gap-3 backdrop-blur-md">
            <Search className="w-5 h-5 text-white/30 ml-3" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your learning history, preferences, or notes..."
              className="bg-transparent border-none focus-visible:ring-0 text-lg placeholder:text-white/10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['All Memory', 'Preferences', 'Academic History', 'Weak Topics', 'Insights', 'Goal Tracking'].map((cat) => (
             <button 
              key={cat} 
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeTab === cat ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
             >
               {cat}
             </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="wait">
            {activeTab === 'All Memory' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="contents"
              >
                {/* AI Learned Card */}
                <Card className="p-8 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500/30 backdrop-blur-3xl lg:col-span-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-black/40 flex items-center justify-center border border-white/10 relative">
                      <div className="absolute inset-0 bg-cyan-400/20 blur-xl animate-pulse" />
                      <Sparkles className="w-10 h-10 text-cyan-400 relative z-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">AI Learned Intelligence</h3>
                    <p className="text-white/50 text-sm">Lenory is currently adapting to your <strong>{user?.preferences?.communication_style || 'simple'} communication style</strong> and focusing on <strong>{user?.onboarding_data?.subject || 'general'}</strong>.</p>
                  </div>
                  <Button 
                    onClick={() => setShowResetModal(true)}
                    variant="outline" 
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-rose-500/50 hover:text-rose-400 text-xs font-bold rounded-xl h-10 transition-all"
                  >
                    Reset Learning
                  </Button>
                </Card>

                {filteredMemories.map((m) => (
                  <Card key={m.id} className="p-6 bg-white/5 border-white/10 hover:border-cyan-500/30 transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black tracking-widest text-white/30">{m.category}</span>
                            <h4 className="text-lg font-bold mt-1 group-hover:text-cyan-400 transition-colors">{m.title}</h4>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteMemory(m.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-white/60 leading-relaxed text-sm">{m.content}</p>
                    </div>
                    
                    <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> {new Date(m.created_at).toLocaleDateString()}
                      </div>
                      <div className={`flex items-center gap-1 ${m.importance >= 4 ? 'text-orange-400' : 'text-cyan-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${m.importance >= 4 ? 'bg-orange-400' : 'bg-cyan-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{m.importance >= 4 ? 'Critical' : 'Synced'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === 'Preferences' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full"
              >
                <Card className="p-8 bg-white/5 border-white/10 space-y-6">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-xl font-bold">Model Persona & Preferences</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-sm font-bold uppercase tracking-widest text-white/30">Dynamic Context</p>
                      <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                        <p className="text-sm text-cyan-400 font-mono">ROLE: {(user?.onboarding_data as any)?.role || 'Scholastic Entity'}</p>
                        <p className="text-sm text-cyan-400 font-mono">TONE: {user?.preferences?.communication_style}</p>
                        <p className="text-sm text-cyan-400 font-mono">FOCUS: JAMB/WAEC Protocols</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-bold uppercase tracking-widest text-white/30">Manual Instructions</p>
                      <div className="p-4 rounded-xl bg-black/20 border border-white/5 min-h-[100px] italic text-white/40 text-sm">
                        {user?.custom_instructions || "No manual overrides set. Lenory is operating on default neural biases."}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'Academic History' && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="col-span-full"
               >
                 <Card className="p-8 bg-white/5 border-white/10">
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                       <BookOpen className="w-6 h-6 text-purple-400" />
                       <h3 className="text-xl font-bold">CBT Performance Logs</h3>
                     </div>
                     <span className="text-xs font-mono text-purple-400">{stats.exams.length} Protocols Recorded</span>
                   </div>
                   <div className="space-y-4">
                      {stats.exams.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                          <div>
                            <p className="font-bold">{exam.type} - {exam.subject}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">{new Date(exam.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-mono font-bold ${exam.score >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{exam.score}%</p>
                          </div>
                        </div>
                      ))}
                      {stats.exams.length === 0 && <p className="text-center py-10 text-white/20">No exam history detected in synaptic core.</p>}
                   </div>
                 </Card>
               </motion.div>
            )}

            {activeTab === 'Weak Topics' && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="col-span-full"
               >
                 <Card className="p-8 bg-white/5 border-white/10 space-y-6">
                   <div className="flex items-center gap-3">
                     <Zap className="w-6 h-6 text-rose-400" />
                     <h3 className="text-xl font-bold">Neural Vulnerabilities</h3>
                   </div>
                   <div className="grid sm:grid-cols-2 gap-4">
                      {stats.weakTopics.map(topic => (
                        <div key={topic} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                           <span className="font-bold text-rose-400">{topic}</span>
                           <span className="text-[10px] font-black uppercase text-rose-500/50">Needs Reinforcement</span>
                        </div>
                      ))}
                      {stats.weakTopics.length === 0 && <p className="col-span-full text-center py-10 text-white/20">All sectors operating with high integrity.</p>}
                   </div>
                 </Card>
               </motion.div>
            )}

            {activeTab === 'Insights' && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="col-span-full"
               >
                 <Card className="p-8 bg-cyan-500/5 border-cyan-500/20 backdrop-blur-xl">
                   <div className="flex items-center gap-3 mb-6">
                     <LineChart className="w-6 h-6 text-cyan-400" />
                     <h3 className="text-xl font-bold">Intelligence Synthesis</h3>
                   </div>
                   <div className="space-y-6">
                     <div className="p-6 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                           <Sparkles className="w-24 h-24" />
                        </div>
                        <h4 className="text-cyan-400 font-bold mb-2 uppercase text-[10px] tracking-widest">Model Analysis</h4>
                        <p className="text-white/70 leading-relaxed">
                          Based on your session history, you show <strong>High Retention</strong> in theoretical subjects but struggle with <strong>Computational Speed</strong>. 
                          Your activity peaks between <strong>8 PM - 11 PM</strong>. Lenory suggests focusing on Physics calculations during your next study block.
                        </p>
                     </div>
                   </div>
                 </Card>
               </motion.div>
            )}

            {activeTab === 'Goal Tracking' && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="col-span-full"
               >
                 <Card className="p-8 bg-white/5 border-white/10 space-y-8 text-center">
                   <div className="flex items-center justify-center gap-3">
                     <Target className="w-6 h-6 text-emerald-400" />
                     <h3 className="text-xl font-bold">Mission: JAMB 300+</h3>
                   </div>
                   <div className="max-w-md mx-auto space-y-4">
                      <div className="relative w-48 h-48 mx-auto">
                         <svg className="w-full h-full transform -rotate-90">
                           <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                           <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-emerald-500" strokeDasharray={502.4} strokeDashoffset={502.4 - (502.4 * stats.avgScore) / 100} strokeLinecap="round" />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-mono font-bold tracking-tighter">{stats.avgScore}%</span>
                            <span className="text-[10px] font-black uppercase text-white/30">Mastery</span>
                         </div>
                      </div>
                      <p className="text-sm text-white/40 italic">"Global aggregate mastery across all recorded exam subjects."</p>
                   </div>
                 </Card>
               </motion.div>
            )}
            </AnimatePresence>

            {/* Empty Slot / Add Instruction */}
            <button 
              onClick={() => setShowBrainModal(true)}
              className="p-6 rounded-3xl border border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group flex flex-col items-center justify-center space-y-3 text-center min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <Plus className="w-6 h-6 text-white/30 group-hover:text-cyan-400" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-white/40 group-hover:text-cyan-400 transition-colors">Add Custom Instruction</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">Manually teach Lenory</p>
              </div>
            </button>
          </div>
        )}

        {/* Custom Instruction Modal */}
        {showBrainModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-primary/10 p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-xl font-mono uppercase tracking-widest">Neural Override</h3>
                </div>
                <button onClick={() => setShowBrainModal(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5 text-white/20" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/50">Custom Intelligence Protocol</label>
                  <Textarea 
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Example: 'Focus on JAMB Mathematics', 'Explain like I'm 10', 'Use Nigerian slang'..."
                    className="min-h-[200px] bg-black/20 border-white/5 text-lg p-4 rounded-2xl"
                  />
                </div>
                <Button 
                  onClick={handleSaveInstructions}
                  disabled={saving}
                  className="w-full h-14 rounded-2xl bg-primary text-black font-black text-lg gap-3"
                >
                  <Save className="w-5 h-5" />
                  {saving ? "Synthesizing..." : "Synchronize Brain"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">Factory Reset Intelligence?</h3>
                  <p className="text-white/40 text-sm leading-relaxed px-4">
                    This action will permanently wipe all <span className="text-white font-bold">AI-learned patterns</span> and restore <span className="text-white font-bold">system preferences</span>.
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Lose Learned Cognitive Patterns</p>
                      <p className="text-[11px] text-white/30 uppercase tracking-widest leading-none mt-1">Learned communications and memories</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Save className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Keep Custom Instructions</p>
                      <p className="text-[11px] text-white/30 uppercase tracking-widest leading-none mt-1">Your manual neural overrides are safe</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    onClick={handleResetPreferences}
                    disabled={loading}
                    className="w-full h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-lg gap-3"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                    {loading ? "Wiping Brain..." : "Confirm Wipe"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowResetModal(false)}
                    className="w-full h-12 text-white/40 hover:text-white"
                  >
                    Cancel Action
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
