import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FluidCanvas from "@/components/FluidCanvas";
import MobileTabBar from "@/components/MobileTabBar";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Lock, AlertCircle, Megaphone, Globe,
} from "lucide-react";
import Logo from "@/components/Logo";

type NavLink = {
  to: string;
  label: string;
  icon: any;
  hideForEngagement?: boolean;
};

const baseAdvertiserLinks: NavLink[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/ads", label: "Ads", icon: Megaphone },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus },
  { to: "/websites", label: "Websites", icon: Globe, hideForEngagement: true },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/docs", label: "API Docs", icon: FileText, hideForEngagement: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus, maintenanceMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [advertiserType, setAdvertiserType] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setAdvertiserType(null); return; }
    supabase
      .from("advertiser_categories")
      .select("advertiser_type")
      .eq("advertiser_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAdvertiserType((data as any)?.advertiser_type ?? null));
  }, [user?.id]);

  const isEngagement = advertiserType === "engagement";
  const advertiserLinks = baseAdvertiserLinks.filter(
    (link) => !(isEngagement && link.hideForEngagement)
  );

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

  const SidebarBody = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={20} />
          <span>Karbali Ads</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="mb-3 px-1 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Menu
          </p>
          {categoryStatus && (
            <Badge
              variant="outline"
              className={`text-[9px] font-normal ${
                isCategoryActive
                  ? "text-primary border-primary/20"
                  : "text-amber-600 border-amber-500/20"
              }`}
            >
              {isCategoryActive ? "Active" : "Pending"}
            </Badge>
          )}
        </div>
        {advertiserLinks.map((link) => {
          const locked = isPageLocked(link.to);
          const active = location.pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={locked ? "#" : link.to}
              onClick={(e) => { if (locked) e.preventDefault(); }}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                locked
                  ? "opacity-40 cursor-not-allowed text-muted-foreground"
                  : active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
              {locked && <Lock className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center justify-between px-2">
          <p className="truncate text-xs text-muted-foreground" title={user?.email}>
            {user?.email}
          </p>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
        </Button>
      </div>
    </>
  );

  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  // Mobile primary tabs (max 5). Drop hidden ones for engagement type.
  const mobileTabs = advertiserLinks.slice(0, 5).map((l) => ({
    to: l.to,
    label: l.label === "New Campaign" ? "Create" : l.label,
    icon: l.icon,
  }));

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-56 flex-col bg-card/90 backdrop-blur-xl border-r border-border">
        {SidebarBody}
      </aside>

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex lg:hidden h-12 items-center justify-between px-4 bg-card/90 backdrop-blur-xl border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={18} />
          <span>Karbali Ads</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="relative z-10 lg:ml-56 flex-1 p-4 pt-16 pb-20 lg:p-6 lg:pt-6 lg:pb-6 min-w-0">
        {maintenanceMode && !walletActivated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Under Development</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This platform is currently under development. Please check back soon.
            </p>
          </div>
        ) : currentPageLocked ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-4">{lockReason}</p>
            {isWalletNotActivated && (
              <Link to="/wallet">
                <Button size="sm">
                  <Wallet className="mr-2 h-4 w-4" /> Go to Wallet
                </Button>
              </Link>
            )}
          </div>
        ) : children}
      </main>

      <MobileTabBar tabs={mobileTabs} />
    </div>
  );
}
