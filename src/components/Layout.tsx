import { ReactNode, useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, PenSquare, Map, FolderOpen, ChevronDown, User, LogIn, LogOut, Shield, FileText, BookOpen, AlertCircle, Scale } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/report", icon: PenSquare, label: "Report" },
  { path: "/map", icon: Map, label: "Map" },
  { path: "/my-reports", icon: FolderOpen, label: "My Reports" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isTabPage = tabs.some((t) => t.path === location.pathname);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    if (confirm("আপনি কি লগআউট করতে চান?")) {
      signOut();
      toast.success("লগআউট সফল");
      setProfileOpen(false);
    }
  };

  if (!isTabPage) {
    return <div className="fixed inset-0 flex flex-col bg-background">{children}</div>;
  }

  const legalLinks = [
    { path: "/legal/privacy-policy", label: "Privacy Policy", icon: Shield },
    { path: "/legal/terms", label: "Terms & Conditions", icon: FileText },
    { path: "/legal/disclaimer", label: "Disclaimer", icon: AlertCircle },
    { path: "/legal/community-guidelines", label: "Community Guidelines", icon: BookOpen },
    { path: "/legal/content-moderation", label: "Content Moderation", icon: Scale },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 h-14 bg-topbar text-topbar-foreground shrink-0 z-50 relative">
        <h1 className="text-lg font-bold tracking-tight">Chor Koi</h1>
        <div className="flex items-center gap-2">
          {/* Profile Icon with Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center"
            >
              <User size={16} />
            </button>
            {profileOpen && (
              <div className="absolute top-10 right-0 bg-card text-foreground rounded-xl shadow-lg z-[999] min-w-[220px] border border-border overflow-hidden">
                {/* Auth section */}
                {user ? (
                  <div className="border-b border-border">
                    <p className="px-3 pt-3 text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-muted transition-colors">
                      <LogOut size={14} /> লগআউট
                    </button>
                  </div>
                ) : (
                  <div className="border-b border-border">
                    <button onClick={() => { navigate("/login"); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-primary hover:bg-muted transition-colors">
                      <LogIn size={14} /> লগইন করুন
                    </button>
                  </div>
                )}

                {/* Legal links */}
                <div className="py-1">
                  {legalLinks.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => { navigate(link.path); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <link.icon size={13} /> {link.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>

      <nav className="flex items-center justify-around h-16 bg-card border-t border-border shrink-0 z-50">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${
                active ? "text-primary scale-105" : "text-muted-foreground"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-[20%] right-[20%] h-0.5 bg-primary rounded-b" />
              )}
              <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
