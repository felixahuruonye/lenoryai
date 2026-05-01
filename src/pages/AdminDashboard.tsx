import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  BarChart3, 
  Activity, 
  Database,
  Cpu,
  Clock,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Security Gate
  if (user && user.email !== "felixahuruonye@gmail.com") {
    return <Redirect to="/dashboard" />;
  }

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // Fetch User Count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch Recent Usage
        const { data: usageData } = await supabase
          .from('api_usage')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        setStats({ userCount });
        setUsage(usageData || []);
      } catch (err) {
        console.error(err);
        toast.error("Admin: Failed to retrieve secure logs.");
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Activity className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-500 font-mono text-sm uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Restricted Access
          </div>
          <h2 className="text-4xl font-bold tracking-tight">System Intelligence Monitor</h2>
          <p className="text-muted-foreground">Global API Quota tracking and User Metrics.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 bg-card/50 border-border">
            <Users className="w-8 h-8 text-blue-500 mb-4" />
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total Entities</p>
            <h3 className="text-3xl font-mono font-bold mt-1">{stats?.userCount || 0}</h3>
          </Card>
          <Card className="p-6 bg-card/50 border-border">
            <BarChart3 className="w-8 h-8 text-emerald-500 mb-4" />
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Daily Token Flux</p>
            <h3 className="text-3xl font-mono font-bold mt-1">128.4k</h3>
          </Card>
          <Card className="p-6 bg-card/50 border-border">
            <Clock className="w-8 h-8 text-purple-500 mb-4" />
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Uptime Latency</p>
            <h3 className="text-3xl font-mono font-bold mt-1">42ms</h3>
          </Card>
          <Card className="p-6 bg-card/50 border-border border-rose-500/20">
            <Cpu className="w-8 h-8 text-rose-500 mb-4" />
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Critical Quota</p>
            <h3 className="text-3xl font-mono font-bold mt-1">98.2% Safe</h3>
          </Card>
        </div>

        <Card className="bg-card/50 border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-accent/30 flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <span className="font-bold">Recent API Synthesis Logs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-accent/20 text-xs uppercase text-muted-foreground font-black">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Entity Identity</th>
                  <th className="p-4">Model Protocol</th>
                  <th className="p-4">Vectors</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usage.map((log) => (
                  <tr key={log.id} className="text-sm hover:bg-accent/10 transition-colors">
                    <td className="p-4 font-mono">{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td className="p-4">{log.user_id?.substring(0, 8)}...</td>
                    <td className="p-4 font-bold">{log.model}</td>
                    <td className="p-4 text-emerald-500">+{log.tokens_estimate}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold">SUCCESS</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
