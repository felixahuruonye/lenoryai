import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  GraduationCap, 
  CalendarDays, 
  BrainCircuit, 
  Globe, 
  Settings, 
  LogOut,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const isAdmin = user?.email === 'felixahuruonye@gmail.com';
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/chat", icon: MessageSquareCode, label: "Ask Lenory" },
    { href: "/exams", icon: GraduationCap, label: "Exams (CBT)" },
    { href: "/study-plan", icon: CalendarDays, label: "Study Planning" },
    { href: "/memory", icon: BrainCircuit, label: "Memory System" },
    { href: "/website-gen", icon: Globe, label: "Website Gen" },
    { href: "/live", icon: Zap, label: "Live AI" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:flex flex-col transition-all duration-300 border-r border-border bg-card/40 backdrop-blur-xl",
        collapsed ? "w-20" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Lenory
            </h1>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                location === item.href 
                  ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(34,211,238,0.05)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                location === item.href ? "text-cyan-400" : "group-hover:text-cyan-400"
              )} />
              {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              {!collapsed && location === item.href && (
                <div className="absolute right-2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" />
              )}
              {collapsed && location === item.href && (
                <div className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_8px_cyan]" />
              )}
            </Link>
          ))}
          
          {isAdmin && (
            <Link 
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-emerald-500/70 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all mt-4",
                location === "/admin" && "bg-emerald-500/10 text-emerald-500"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              {!collapsed && <span className="font-medium">Admin Panel</span>}
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-3", collapsed ? "px-2" : "px-4")}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </Button>

          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3",
              collapsed ? "px-2" : "px-4"
            )}
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Lenory
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Glow Effects */}
        <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 md:py-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
