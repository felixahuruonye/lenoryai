import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  Activity, 
  Database, 
  CreditCard, 
  ShieldAlert, 
  Search, 
  MoreHorizontal,
  ArrowUpRight,
  RefreshCw,
  Ban,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useLocation } from "wouter";

export default function Admin() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }
    fetchUsers();
  }, [isAdmin, setLocation]);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const [systemHealth, setSystemHealth] = useState("Healthy");
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    setActiveUsers(users.length);
  }, [users]);

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldAlert className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Restricted Access</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">System Control Panel</h2>
              <p className="text-white/40 font-medium">Enterprise-level management for Lenory infrastructure.</p>
           </div>

           <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest font-mono">Status: {systemHealth}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-white/30 hover:text-white rounded-xl"
                onClick={fetchUsers}
                disabled={loading}
              >
                 <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
              </Button>
           </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: "Total Users", value: users.length.toString(), icon: Users, color: "text-blue-400" },
             { label: "Onboarded", value: users.filter(u => u.onboarding_completed).length.toString(), icon: Activity, color: "text-emerald-400" },
             { label: "API Credits", value: "NGN (Naira)", icon: CreditCard, color: "text-cyan-400" },
             { label: "Storage Mode", value: "Cloud SQL", icon: Database, color: "text-purple-400" },
           ].map((stat) => (
             <Card key={stat.label} className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all flex flex-col gap-4">
               <div className={cn("p-2 rounded-lg bg-current/10 w-fit", stat.color)}>
                 <stat.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-3xl font-mono font-bold">{stat.value}</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/30">{stat.label}</p>
               </div>
             </Card>
           ))}
        </div>

        {/* User Management */}
        <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
           <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                User Directory
              </h3>
              <div className="relative md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                 <Input 
                  placeholder="Search by name, email, or Lenory ID..." 
                  className="bg-white/5 border-white/10 pl-10 h-11 rounded-xl focus-visible:ring-cyan-500/50"
                 />
              </div>
           </div>

           <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs uppercase font-black tracking-widest text-white/30 h-14">Lenory ID</TableHead>
                  <TableHead className="text-xs uppercase font-black tracking-widest text-white/30">User Details</TableHead>
                  <TableHead className="text-xs uppercase font-black tracking-widest text-white/30">Onboarding</TableHead>
                  <TableHead className="text-xs uppercase font-black tracking-widest text-white/30">Status</TableHead>
                  <TableHead className="text-xs uppercase font-black tracking-widest text-white/30 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-mono font-bold text-cyan-400">{(u.lenory_id || u.id.substring(0,8)).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{u.name || 'Anonymous'}</span>
                        <span className="text-xs text-white/40">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-white/60">
                           {u.onboarding_data?.subject || 'No Subject'}
                        </span>
                        <span className="text-[10px] text-white/30">
                           {u.onboarding_data?.goal?.substring(0, 30)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit border",
                        u.email === 'felixahuruonye@gmail.com' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                        u.onboarding_completed ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" :
                        "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                      )}>
                        {u.email === 'felixahuruonye@gmail.com' ? 'Admin' : (u.onboarding_completed ? 'Onboarded' : 'Pending')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2 text-white/30">
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/5 hover:text-white rounded-lg">
                            <ArrowUpRight className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-500/10 hover:text-red-400 rounded-lg">
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/5 hover:text-white rounded-lg">
                            <MoreHorizontal className="w-5 h-5" />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
           </Table>
        </Card>

        {/* Real-time Logs Section */}
        <div className="grid lg:grid-cols-12 gap-8">
           <Card className="lg:col-span-8 bg-black/40 border-white/10 rounded-3xl overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                 <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Real-time API Logs
                 </h4>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase font-bold text-white/30">Live Streaming</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                 </div>
              </div>
              <ScrollArea className="flex-1 p-4 font-mono text-[11px] leading-relaxed">
                 <div className="space-y-1 text-white/50">
                    <p><span className="text-white/30">[11:14:02]</span> <span className="text-blue-400">INFO:</span> Received chat request from LRN-B4V8N3</p>
                    <p><span className="text-white/30">[11:14:02]</span> <span className="text-emerald-400">AUTH:</span> Supabase Session Validated</p>
                    <p><span className="text-white/30">[11:14:03]</span> <span className="text-cyan-400">AI:</span> Calling GPT-4o-mini tier...</p>
                    <p><span className="text-white/30">[11:14:05]</span> <span className="text-emerald-400">SUCCESS:</span> Chat response generated (lat: 2.1s)</p>
                    <p><span className="text-white/30">[11:14:08]</span> <span className="text-orange-400">CREDIT:</span> Deducted 1 credit from LRN-B4V8N3</p>
                    <p className="border-l-2 border-red-500/50 pl-2 bg-red-500/5 py-1 text-red-400/70"><span className="text-white/30">[11:15:10]</span> <span className="text-red-500 font-bold">ERROR:</span> Stability API Quota Exceeded. Switching to DALL-E fallback...</p>
                    <p><span className="text-white/30">[11:15:12]</span> <span className="text-emerald-400">INFO:</span> Fallback successful.</p>
                 </div>
              </ScrollArea>
           </Card>

           <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 bg-white/5 border-white/10 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">Manual Credit Injection</h4>
                  <div className="space-y-3">
                     <Input placeholder="User Email or ID" className="bg-white/5 border-white/10 h-11 rounded-xl" />
                     <Input placeholder="Amount (e.g. 50)" type="number" className="bg-white/5 border-white/10 h-11 rounded-xl" />
                     <Button className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl">
                        Apply Credits
                     </Button>
                  </div>
              </Card>

              <Card className="p-6 bg-white/5 border-red-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">System Health</h4>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between text-xs">
                        <span className="text-white/40">OpenAI Quota</span>
                        <span className="text-emerald-500">92% Remaining</span>
                     </div>
                     <Progress value={92} className="h-1.5 bg-white/10" />
                     <div className="flex justify-between text-xs">
                        <span className="text-white/40">Stability API</span>
                        <span className="text-yellow-500">12% Remaining</span>
                     </div>
                     <Progress value={12} className="h-1.5 bg-white/10" />
                  </div>
              </Card>
           </div>
        </div>
      </div>
    </Layout>
  );
}
