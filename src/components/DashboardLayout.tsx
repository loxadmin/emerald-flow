import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Menu, X, Lock, AlertCircle, Megaphone, Globe, ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";

const baseAdvertiserLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { to: "/ads", label: "Ads", icon: Megaphone, group: "Main" },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus, group: "Main" },
  { to: "/websites", label: "Websites", icon: Globe, hideForEngagement: true, group: "Setup" },
  { to: "/wallet", label: "Wallet", icon: Wallet, group: "Setup" },
  { to: "/docs", label: "API Docs", icon: FileText, hideForEngagement: true, group: "Setup" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus, maintenanceMode } = useAuth();
  const [advertiserType, setAdvertiserType] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setAdvertiserType(null); return; }
    supabase
      .from("advertiser_categories")
      .select("advertiser_type")
      .eq("advertiser_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAdvertiserType((data as any)?.advertiser_type ?? null);
      });
  }, [user?.id]);

  const isEngagement = advertiserType === "engagement";
  const advertiserLinks = baseAdvertiserLinks.filter(
    (link) => !(isEngagement && link.hideForEngagement)
  );
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isWalletNotActivated = walletActivated !== true;
  const isCategoryInactive = categoryStatus === "waiting_list";
  const isCategoryActive = categoryStatus === "active";

  const isPageLocked = (path: string) => {
    if (path === "/wallet" || path === "/docs" || path === "/websites") return false;
    if (isCategoryInactive) return true;
    if (isWalletNotActivated) return true;
    return false;
  };

  const getLockReason = () => {
    if (isCategoryInactive) return "Your category is not live yet. Please wait for activation.";
    if (isWalletNotActivated) return "Please activate your payment method first.";
    return "";
  };

  const groups = ["Main", "Setup"];
  const currentLink = advertiserLinks.find(l => l.to === location.pathname);

  const sidebar = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Logo size={20} />
          <span>Karbali</span>
        </Link>
        <button className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {categoryStatus && (
          <div className="px-2">
            <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${
              isCategoryActive ? "border-primary/30 text-primary bg-primary/5" : "border-amber-500/30 text-amber-600 bg-amber-500/5"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isCategoryActive ? "bg-primary" : "bg-amber-500"}`} />
              {isCategoryActive ? "Category active" : "Category pending"}
            </div>
          </div>
        )}
        {groups.map((group) => {
          const links = advertiserLinks.filter(l => l.group === group);
          if (!links.length) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{group}</p>
              {links.map((link) => {
                const locked = isPageLocked(link.to);
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={locked ? "#" : link.to}
                    onClick={(e) => { if (locked) e.preventDefault(); setMobileMenuOpen(false); }}
                    className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      locked ? "opacity-40 cursor-not-allowed text-muted-foreground" :
                      active ? "bg-foreground/[0.06] text-foreground font-medium" :
                      "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                    }`}
                  >
                    <link.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                    <span className="flex-1">{link.label}</span>
                    {locked && <Lock className="h-3 w-3" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
            {(user?.email || "?")[0].toUpperCase()}
          </div>
          <p className="flex-1 truncate text-xs text-foreground">{user?.email}</p>
          <button onClick={toggleTheme} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Toggle theme">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-60 flex-col bg-card border-r border-border">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-12 items-center justify-between px-4 bg-card border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={18} />
          <span>Karbali</span>
        </Link>
        <button onClick={() => setMobileMenuOpen(true)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-card border-r border-border lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-12 items-center gap-2 border-b border-border bg-background/80 backdrop-blur px-6">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <span>Advertiser</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{currentLink?.label || "Dashboard"}</span>
          </nav>
        </header>

        <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-6 min-w-0">
          {maintenanceMode && !walletActivated ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-1">Under Development</h2>
              <p className="text-sm text-muted-foreground max-w-md">This platform is currently under development. Please check back soon.</p>
            </div>
          ) : currentPageLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-4">{lockReason}</p>
              {isWalletNotActivated && (
                <Link to="/wallet"><Button size="sm"><Wallet className="mr-2 h-4 w-4" /> Go to Wallet</Button></Link>
              )}
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}
