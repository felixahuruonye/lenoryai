import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  History,
  BookOpen,
  ArrowLeft,
  Trophy,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";
import { AIService } from "@/services/aiService";

const EXAM_TYPES = ["JAMB", "WAEC", "NECO", "UNIVERSITY Post-UTME"];
const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology", 
  "Economics", "Government", "Literature", "Christian Religious Knowledge", "Geography"
];

export default function Exams() {
  const { user } = useAuth();
  const [step, setStep] = useState<'lobby' | 'select' | 'exam' | 'result' | 'history'>('lobby');
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [currentSubjectTab, setCurrentSubjectTab] = useState<string>("");
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [selectedPastExam, setSelectedPastExam] = useState<any | null>(null);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const toastId = toast.loading("Fetching your academic records...");
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExamHistory(data || []);
      setStep('history');
      toast.dismiss(toastId);
    } catch (error) {
      console.error("History fetch error:", error);
      toast.error("Could not load exam history.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const saveExamResult = async () => {
    if (!user || questions.length === 0) return;

    const correctCount = Object.entries(answers).filter(([qIdx, a]) => a === questions[parseInt(qIdx)].correct).length;
    const score = Math.round((correctCount / questions.length) * 400);

    try {
      const { error } = await supabase.from('exams').insert({
        user_id: user.id,
        subject: selectedSubjects.join(', '),
        type: selectedType,
        duration: duration,
        score: score,
        questions: questions,
        results: {
          answers,
          timeSpent,
          correctCount,
          totalQuestions: questions.length
        }
      });

      if (error) throw error;
      toast.success("Exam result saved to your history!");
    } catch (error) {
      console.error("Error saving exam result:", error);
      toast.error("Result calculated, but couldn't sync to cloud. Check your connection.");
    }
  };

  const finishExam = () => {
    const correctCount = Object.entries(answers).filter(([qIdx, a]) => a === questions[parseInt(qIdx)].correct).length;
    const score = Math.round((correctCount / questions.length) * 400);
    
    if (score >= 300) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });
    }
    
    saveExamResult();
    setStep('result');
    setSelectedPastExam(null); // Reset past exam if it was a new one
  };

  const startExam = async () => {
    if (!selectedType || selectedSubjects.length === 0) {
      toast.error("Please select an exam type and subjects.");
      return;
    }
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      toast.error("AI Configuration Missing: Please set your GEMINI_API_KEY in the Settings menu to use this feature.");
      return;
    }

    setLoading(true);
    try {
      const prompt = `You are a Senior Examiner for ${selectedType} in Nigeria. Generate a professional and highly accurate set of 40 exam questions covering these subjects: ${selectedSubjects.join(', ')}.
      
      Context:
      - Target Exam: ${selectedType} (JAMB UTME, WAEC SSCE, NECO SSCE, or Post-UTME).
      - Curriculum: Strictly follow the official ${selectedType} syllabus.
      - Accuracy: Ensure no ambiguous questions. Each must have exactly one correct answer.
      
      Data Structure:
      - Return a JSON array of 40 question objects.
      - Each object:
        - text: (string) The question.
        - options: (string[]) Exactly 4 options.
        - correct: (number) Index 0-3 of the correct option.
        - subject: (string) Which subject this belongs to.
        - explanation: (string) Concise reason why this answer is correct.
      
      Output ONLY THE JSON.`;

      const generatedQuestions = await AIService.generate(user.id, prompt, true);

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error("No questions generated by the AI.");
      }

      setQuestions(generatedQuestions);
      setCurrentSubjectTab(generatedQuestions[0]?.subject || selectedSubjects[0]);
      setTimeLeft(duration * 60);
      setStep('exam');
      toast.success("Exam started! All questions are fresh for 2024/2025 prep.");
      
      // Deduct credits via backend (Soft check)
      fetch("/api/chat/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      }).catch(console.error);
    } catch (error: any) {
      console.error("Exam Gen Failure:", error);
      toast.error(error.message || "Cloud Error: Could not generate current questions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        setTimeSpent(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && step === 'exam') {
      toast.error("Time is up! Your exam has been automatically submitted.");
      finishExam();
    }
  }, [step, timeLeft]);

  useEffect(() => {
    if (questions[activeQuestion]?.subject) {
      setCurrentSubjectTab(questions[activeQuestion].subject);
    }
  }, [activeQuestion, questions]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {step === 'lobby' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20 shadow-lg">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">CBT Simulation Center</h2>
              <p className="text-muted-foreground text-lg">Master your exams with real-time simulations and AI-powered insights.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card 
                className="p-8 bg-card border-border hover:bg-accent transition-all group flex flex-col items-center justify-center space-y-4 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]" 
                onClick={() => setStep('select')}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Start New Simulation</h3>
                  <p className="text-muted-foreground text-sm">Choose subjects and duration.</p>
                </div>
              </Card>

              <Card 
                className="p-8 bg-card border-border hover:bg-accent transition-all group flex flex-col items-center justify-center space-y-4 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]" 
                onClick={fetchHistory}
              >
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground/70">Review Performance</h3>
                  <p className="text-muted-foreground text-sm">See previous mock exam results.</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 'select' && (
          <Card className="p-8 bg-card/50 border-border backdrop-blur-xl animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setStep('lobby')} className="text-foreground"><ArrowLeft className="w-5 h-5" /></Button>
              <h3 className="text-2xl font-bold text-foreground">Exam Configuration</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Select Exam Body</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {EXAM_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-sm font-bold",
                        selectedType === type ? "bg-primary border-primary text-primary-foreground shadow-lg" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Subjects (Select up to 4)</Label>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {SUBJECTS.map(sub => (
                    <button
                      key={sub}
                      onClick={() => {
                        if (selectedSubjects.includes(sub)) {
                          setSelectedSubjects(prev => prev.filter(s => s !== sub));
                        } else if (selectedSubjects.length < 4) {
                          setSelectedSubjects(prev => [...prev, sub]);
                        }
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-xs font-medium transition-all",
                        selectedSubjects.includes(sub) ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Duration</Label>
                    <span className="text-primary font-mono font-bold">{duration} Minutes</span>
                  </div>
                  <input 
                    type="range" min="30" max="120" step="15" 
                    value={duration} onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button 
                    disabled={!selectedType || selectedSubjects.length === 0 || loading}
                    onClick={startExam}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl text-lg gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Real Questions...
                      </>
                    ) : (
                      <>
                        Launch Simulation <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 'exam' && questions.length > 0 && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Questions Panel */}
            <div className="lg:col-span-8 space-y-6">
              {/* Subject Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {selectedSubjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      setCurrentSubjectTab(sub);
                      const firstIdx = questions.findIndex(q => q.subject === sub);
                      if (firstIdx !== -1) setActiveQuestion(firstIdx);
                    }}
                    className={cn(
                      "px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border",
                      currentSubjectTab === sub 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg" 
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <Card className="p-8 bg-card border-border backdrop-blur-xl rounded-3xl min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">{questions[activeQuestion]?.subject || selectedSubjects[0]}</span>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">Question {activeQuestion + 1}</h3>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-500" />
                    <span className="font-mono text-xl font-bold text-red-500">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-8">
                  <p className="text-xl leading-relaxed text-foreground/90 font-medium">
                    {questions[activeQuestion].text}
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {questions[activeQuestion].options.map((opt, i) => (
                      <button 
                        key={i} 
                        onClick={() => setAnswers(prev => ({ ...prev, [activeQuestion]: i }))}
                        className={cn(
                          "p-5 rounded-2xl border transition-all text-left flex items-center gap-4 group",
                          answers[activeQuestion] === i 
                            ? "bg-primary/10 border-primary shadow-sm" 
                            : "bg-muted/30 border-border hover:bg-muted hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors",
                          answers[activeQuestion] === i 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted border border-border group-hover:text-primary group-hover:border-primary/30"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className={cn(
                          "transition-colors",
                          answers[activeQuestion] === i ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"
                        )}>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-border">
                  <Button variant="ghost" disabled={activeQuestion === 0} onClick={() => setActiveQuestion(prev => prev - 1)} className="gap-2 text-muted-foreground">
                    <ChevronRight className="w-5 h-5 rotate-180" /> Previous
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      if (activeQuestion < questions.length - 1) setActiveQuestion(prev => prev + 1);
                      else finishExam();
                    }} 
                    className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold"
                  >
                    {activeQuestion === questions.length - 1 ? "Submit Exam" : "Next Question"} <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Sidebar / Progress */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 bg-card border-border backdrop-blur-xl rounded-3xl space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Navigator</h4>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded">{currentSubjectTab}</span>
                 </div>
                 <div className="grid grid-cols-5 gap-2">
                   {questions.map((q, i) => {
                     if (q.subject !== currentSubjectTab) return null;
                     return (
                       <button 
                        key={i}
                        onClick={() => setActiveQuestion(i)}
                        className={cn(
                          "w-full aspect-square rounded-lg text-xs font-bold transition-all border",
                          activeQuestion === i ? "bg-primary border-primary text-primary-foreground" : 
                          answers[i] !== undefined ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                          "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                        )}
                       >
                         {i + 1}
                       </button>
                     );
                   })}
                 </div>

                 <div className="pt-6 border-t border-border space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                      <span>Overall Progress</span>
                      <span>{Math.round(((Object.keys(answers).length) / questions.length) * 100)}%</span>
                    </div>
                    <Progress value={(Object.keys(answers).length / questions.length) * 100} className="h-1.5 bg-muted" />
                    
                    <Button 
                      variant="destructive" 
                      className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/10 active:scale-95 transition-transform"
                      onClick={() => finishExam()}
                    >
                      End Exam & Submit
                    </Button>
                 </div>
              </Card>

              <Card className="p-6 bg-card border-border backdrop-blur-xl rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Warning</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Do not refresh this page or leave the browser. Doing so will result in immediate disqualification and loss of exam credits.
                </p>
              </Card>
            </div>
          </div>
        )}

        {step === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep('lobby')} className="text-foreground"><ArrowLeft className="w-5 h-5" /></Button>
              <h3 className="text-2xl font-bold text-foreground">Exam History</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your achievements...</p>
              </div>
            ) : examHistory.length === 0 ? (
              <Card className="p-12 text-center space-y-4 bg-muted/20 border-dashed border-2">
                <History className="w-12 h-12 text-muted-foreground mx-auto" />
                <h4 className="text-xl font-bold">No Records Yet</h4>
                <p className="text-muted-foreground">Take your first simulation to start tracking progress.</p>
                <Button onClick={() => setStep('select')}>Start Exam</Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {examHistory.map(exam => (
                  <Card key={exam.id} className="p-6 border-border hover:border-primary/50 transition-all group cursor-pointer" onClick={() => {
                    setSelectedPastExam(exam);
                    const safeQuestions = typeof exam.questions === 'string' ? JSON.parse(exam.questions) : exam.questions;
                    const safeResults = typeof exam.results === 'string' ? JSON.parse(exam.results) : exam.results;
                    const safeAnswers = typeof safeResults.answers === 'string' ? JSON.parse(safeResults.answers) : safeResults.answers;
                    
                    setQuestions(safeQuestions);
                    setAnswers(safeAnswers);
                    setTimeSpent(safeResults.timeSpent);
                    setSelectedType(exam.type);
                    setSelectedSubjects(exam.subject.split(', '));
                    setStep('result');
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded">{exam.type}</span>
                          <span className="text-sm font-bold">{exam.subject}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(exam.created_at).toLocaleDateString()} • {exam.duration} mins session</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className={cn(
                          "text-2xl font-mono font-bold",
                          exam.score >= 200 ? "text-emerald-500" : "text-amber-500"
                        )}>{exam.score} / 400</p>
                        <Button variant="ghost" size="sm" className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10">
                          View Details <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-8 animate-in zoom-in duration-500 max-w-4xl mx-auto">
            <Card className="p-12 bg-card border-border backdrop-blur-2xl text-center space-y-8 rounded-[3rem] relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
               <div className="w-32 h-32 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center border-4 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  <Trophy className="w-16 h-16 text-emerald-500" />
               </div>
               
               <div className="space-y-2">
                 <h2 className="text-4xl font-bold text-foreground">Exam Completed!</h2>
                 <p className="text-muted-foreground text-lg">Detailed analysis of your performance in {selectedSubjects.join(', ')}.</p>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border">
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Total Score</p>
                   <p className="text-3xl font-mono font-bold text-emerald-500">
                     {Math.round((Object.entries(answers).filter(([qIdx, a]) => a === questions[parseInt(qIdx)].correct).length / questions.length) * 400 || 0)} / 400
                   </p>
                 </div>
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border">
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Accuracy</p>
                   <p className="text-3xl font-mono font-bold text-primary">
                     {Math.round((Object.entries(answers).filter(([qIdx, a]) => a === questions[parseInt(qIdx)].correct).length / questions.length) * 100 || 0)}%
                   </p>
                 </div>
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border">
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Time Spent</p>
                   <p className="text-3xl font-mono font-bold text-amber-500">{formatTime(timeSpent)}</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border">
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Attempted</p>
                   <p className="text-3xl font-mono font-bold text-blue-500">{Object.keys(answers).length} / {questions.length}</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border">
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Verdict</p>
                   <p className="text-lg font-bold text-foreground uppercase tracking-tight">
                     {(Object.entries(answers).filter(([qIdx, a]) => a === questions[parseInt(qIdx)].correct).length / questions.length) >= 0.5 ? "Qualified" : "Retry"}
                   </p>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-4">
                 <Button className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl text-lg" onClick={() => {
                   if (selectedPastExam) {
                     setStep('history');
                   } else {
                     setStep('lobby');
                   }
                 }}>
                   {selectedPastExam ? "Back to History" : "Return to Lobby"}
                 </Button>
                 <Button variant="outline" className="w-full h-14 border-2 font-bold rounded-2xl text-lg hover:bg-muted" onClick={() => (document.getElementById('review-section') as any)?.scrollIntoView({ behavior: 'smooth' })}>
                   Review Explanations
                 </Button>
               </div>
            </Card>

            <div id="review-section" className="space-y-6 pt-10">
               <h3 className="text-2xl font-bold flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                 Question Review
               </h3>
               <div className="space-y-4 pb-20">
                 {questions.map((q, i) => (
                   <Card key={i} className={cn(
                     "p-6 border-l-4",
                     answers[i] === q.correct ? "border-l-emerald-500" : "border-l-red-500"
                   )}>
                     <div className="space-y-4">
                       <div className="flex justify-between items-start gap-4">
                         <p className="font-bold text-foreground leading-relaxed">Q{i+1}: {q.text}</p>
                         <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">{q.subject}</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                         {q.options.map((opt: string, idx: number) => (
                           <div key={idx} className={cn(
                             "p-3 rounded-xl text-sm border flex items-center justify-between",
                             idx === q.correct ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-bold" :
                             idx === answers[i] ? "bg-red-500/10 border-red-500/30 text-red-600" :
                             "bg-muted/30 border-border text-muted-foreground"
                           )}>
                             <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                             {idx === q.correct && <CheckCircle2 className="w-4 h-4" />}
                           </div>
                         ))}
                       </div>
                       <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                         <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Explanation:</p>
                         <p className="text-sm text-foreground/80 leading-relaxed italic">{q.explanation}</p>
                       </div>
                     </div>
                   </Card>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
