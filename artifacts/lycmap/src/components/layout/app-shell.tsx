import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Brain, LayoutDashboard, MessageSquare, Play, Sparkles } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_Jul_19,_2026,_07_31_55_PM_1785165664193.png";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/quiz", label: "Quiz Setup", icon: Play },
    { href: "/stats", label: "Stats", icon: Brain },
    { href: "/chat", label: "AI Tutor", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground selection:bg-primary/30">
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/50 bg-card/50 backdrop-blur-xl md:fixed md:h-screen md:left-0 md:top-0 z-50 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <img src={logoImg} alt="lycmap.ai Logo" className="w-10 h-10 rounded-lg shadow-lg shadow-primary/20" />
          <span className="font-bold text-xl tracking-tight">lycmap<span className="text-primary">.ai</span></span>
        </div>
        
        <div className="flex-1 px-4 py-2 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? "bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_rgba(220,38,38,0.2)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:scale-110 transition-transform"}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 mt-auto hidden md:block">
          <div className="rounded-xl p-4 bg-gradient-to-br from-accent/20 to-primary/10 border border-white/5 relative overflow-hidden">
            <Sparkles className="w-5 h-5 text-accent mb-2" />
            <h4 className="text-sm font-medium mb-1">AI Study Partner</h4>
            <p className="text-xs text-muted-foreground">Your 24/7 private tutor</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 md:pl-64 flex flex-col min-h-[100dvh] relative">
        <div className="flex-1 pb-16 md:pb-0">
          {children}
        </div>
        
        <div className="fixed bottom-4 right-4 pointer-events-none z-50 mix-blend-screen opacity-30 select-none">
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
            R.K creation
          </span>
        </div>
      </main>
    </div>
  );
}
