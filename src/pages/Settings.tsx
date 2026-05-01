import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Palette, 
  Shield, 
  Volume2, 
  Keyboard, 
  Trash2, 
  Camera,
  Fingerprint,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Monitor
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "Student");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground font-medium">Manage your account, preferences, and AI assistant behavior.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-14 rounded-2xl w-full justify-start space-x-1 backdrop-blur-xl">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'account', label: 'Account', icon: Fingerprint },
              { id: 'display', label: 'Appearance', icon: Palette },
              { id: 'voice', label: 'Voice Settings', icon: Volume2 },
            ].map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="rounded-xl px-6 h-full data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-bold transition-all gap-2"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-8">
            <TabsContent value="profile" className="space-y-6">
               <Card className="p-8 bg-white/5 border-white/10 rounded-[2rem] space-y-8 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                     <div className="relative group">
                        <Avatar className="w-32 h-32 border-4 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-transform group-hover:scale-105 duration-500">
                           <AvatarImage src={user?.avatar_url} />
                           <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl font-black text-black">
                              {user?.name?.[0] || 'S'}
                           </AvatarFallback>
                        </Avatar>
                        <button className="absolute bottom-1 right-1 p-2 bg-black/80 rounded-xl border border-white/10 text-cyan-400 hover:scale-110 transition-all shadow-xl">
                           <Camera className="w-5 h-5" />
                        </button>
                     </div>
                     <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                           <h3 className="text-2xl font-bold">Your Identity</h3>
                           <p className="text-white/40 text-sm">Update your public name and profile picture displayed on the dashboard.</p>
                        </div>
                        <Button variant="outline" className="h-11 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 gap-2 border-dashed">
                           <ExternalLink className="w-4 h-4" /> Import from Lenory Social
                        </Button>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-1 gap-6 pt-6 border-t border-white/5">
                     <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Display Name</Label>
                        <div className="flex gap-4">
                          <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-medium focus-visible:ring-cyan-500/50" 
                          />
                          <Button className="h-12 px-8 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            Save Changes
                          </Button>
                        </div>
                     </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card className="p-8 bg-white/5 border-white/10 rounded-[2rem] space-y-8">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                       <h3 className="text-xl font-bold">Authentication Details</h3>
                       <p className="text-white/40 text-sm">Your unique identifiers within the LENORY network.</p>
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                       <Fingerprint className="w-5 h-5 text-cyan-400" />
                       <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Lenory ID</span>
                          <span className="font-mono font-bold text-sm uppercase">{user?.lenory_id || 'NOT_SET'}</span>
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg ml-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></Button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {[
                      { label: "Notification Settings", icon: Bell, desc: "Manage PWA and email alerts" },
                      { label: "Privacy & Data", icon: Shield, desc: "Control your persistent learning memory" },
                      { label: "Keyboard Shortcuts", icon: Keyboard, desc: "Speed up your workflow" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                           <div className="p-2.5 rounded-xl bg-white/5 text-white/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                              <item.icon className="w-5 h-5" />
                           </div>
                           <div className="flex flex-col">
                              <span className="font-bold">{item.label}</span>
                              <span className="text-xs text-white/30">{item.desc}</span>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                      </div>
                    ))}
                 </div>

                 <div className="pt-8 border-t border-red-500/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                       <div className="space-y-1">
                          <h4 className="text-red-400 font-bold">Danger Zone</h4>
                          <p className="text-red-400/40 text-xs">Permanently delete your account and all associated learning memory.</p>
                       </div>
                       <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white font-bold h-11 rounded-xl px-6 gap-2">
                          <Trash2 className="w-4 h-4" /> Delete Account
                       </Button>
                    </div>
                 </div>
              </Card>
            </TabsContent>

            <TabsContent value="display" className="space-y-6">
               <Card className="p-8 bg-white/5 border-white/10 rounded-[2rem] space-y-8">
                  <div className="space-y-1 text-center md:text-left">
                     <h3 className="text-xl font-bold">Appearance Customization</h3>
                     <p className="text-white/40 text-sm">Choose how LENORY looks on your device.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Theme Engine</Label>
                        <div className="grid grid-cols-2 gap-3">
                           {['Futuristic', 'Minimal', 'Dark Mode', 'Nature'].map(t => (
                             <button key={t} className={cn("p-4 rounded-xl border transition-all text-sm font-bold flex items-center justify-between", t === 'Futuristic' ? "bg-cyan-500 border-cyan-400 text-black" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")}>
                               {t}
                               {t === 'Futuristic' && <CheckCircle2 className="w-4 h-4" />}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-6 border-l border-white/5 pl-8">
                        <div className="flex items-center justify-between">
                           <div className="space-y-0.5">
                              <p className="font-bold">Glassmorphism Effects</p>
                              <p className="text-[10px] text-white/30 uppercase font-black">Enable premium transparency</p>
                           </div>
                           <Switch checked className="data-[state=checked]:bg-cyan-500" />
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="space-y-0.5">
                              <p className="font-bold">Neon Glow</p>
                              <p className="text-[10px] text-white/30 uppercase font-black">Render high-glow accents</p>
                           </div>
                           <Switch checked className="data-[state=checked]:bg-cyan-500" />
                        </div>
                     </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="voice" className="space-y-6">
              <Card className="p-8 bg-white/5 border-white/10 rounded-[2rem] space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold">Voice & Speech Engine</h3>
                      <p className="text-white/40 text-sm">Powered by ElevenLabs for realistic human-like interaction.</p>
                   </div>
                   <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                      <Button variant="ghost" className="h-10 rounded-lg text-xs font-bold gap-2"><Monitor className="w-4 h-4" /> System Test</Button>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="space-y-4">
                         <Label className="text-xs uppercase tracking-widest font-bold text-white/40">Voice Gender</Label>
                         <div className="grid grid-cols-2 gap-4">
                            <button className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-cyan-500 bg-cyan-500/10 text-cyan-400 transition-all font-bold group">
                               <div className="w-12 h-12 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                                  <User className="w-6 h-6" />
                               </div>
                               Male (Adam)
                            </button>
                            <button className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-white/5 bg-white/5 text-white/40 hover:border-white/10 hover:text-white transition-all font-bold group">
                               <div className="w-12 h-12 rounded-full bg-white/10 text-white/50 flex items-center justify-center">
                                  <User className="w-6 h-6" />
                               </div>
                               Female (Bella)
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs uppercase tracking-widest font-bold text-white/40">Voice Stability</Label>
                          <span className="text-cyan-400 font-mono text-xs">50%</span>
                        </div>
                        <input type="range" className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs uppercase tracking-widest font-bold text-white/40">Similarity Boost</Label>
                          <span className="text-cyan-400 font-mono text-xs">75%</span>
                        </div>
                        <input type="range" className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                         <div className="space-y-0.5">
                            <p className="font-bold">Voice-First Mode</p>
                            <p className="text-[10px] text-white/30 uppercase font-black">Enable "Hey Lenory" Wake Word</p>
                         </div>
                         <Switch checked className="data-[state=checked]:bg-cyan-500" />
                      </div>
                   </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
