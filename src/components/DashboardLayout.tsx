import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Menu, X, Lock, AlertCircle, Megaphone, Globe, ChevronRight,
  Sparkles,
} from "lucide-react";
import Logo from "@/components/Logo";

const baseAdvertiserLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { to: "/ads", label: "Campaigns", icon: Megaphone, group: "Workspace" },
  { to: "/campaigns/create", label: "New campaign", icon: Plus, group: "Workspace" },
  { to: "/websites", label: "Websites", icon: Globe, hideForEngagement: true, group: "Account" },
  { to: "/wallet", label: "Wallet", icon: Wallet, group: "Account" },
  { to: "/docs", label: "API & Docs", icon: FileText, hideForEngagement: true, group: "Account" },
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
        setAdvertiserType((data as { advertiser_type?: string } | null)?.advertiser_type ?? null);
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
    if (isWalletNotActivated) return "Activate your wallet to unlock the rest of your workspace.";
    return "";
  };

  const groups = ["Workspace", "Account"];
  const currentLink = advertiserLinks.find((l) => l.to === location.pathname);
  const initial = (user?.email || "?")[0].toUpperCase();

  const sidebar = (
    <>
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Logo size={16} />
          </div>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold tracking-tight text-white">Karbali</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Advertiser</p>
          </div>
        </Link>
        <button
          className="lg:hidden rounded-md p-1.5 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5">
        <hr className="divider-dashed-sidebar" />
      </div>

      {/* Status pill */}
      {categoryStatus && (
        <div className="px-4 pt-4">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${
              isCategoryActive
                ? "border-sidebar-primary/40 bg-sidebar-primary/10 text-sidebar-primary"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isCategoryActive ? "bg-sidebar-primary" : "bg-amber-400"
              } animate-pulse`}
            />
            <span className="font-medium">
              {isCategoryActive ? "Workspace active" : "Workspace pending"}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group) => {
          const links = advertiserLinks.filter((l) => l.group === group);
          if (!links.length) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {group}
              </p>
              {links.map((link) => {
                const locked = isPageLocked(link.to);
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={locked ? "#" : link.to}
                    onClick={(e) => {
                      if (locked) e.preventDefault();
                      setMobileMenuOpen(false);
                    }}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-all ${
                      locked
                        ? "opacity-40 cursor-not-allowed text-sidebar-foreground"
                        : active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-[0_4px_12px_-4px_hsl(var(--sidebar-primary)/0.5)]"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                    }`}
                  >
                    <link.icon className="h-[16px] w-[16px] shrink-0" />
                    <span className="flex-1 truncate">{link.label}</span>
                    {locked && <Lock className="h-3 w-3" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer / user */}
      <div className="px-5">
        <hr className="divider-dashed-sidebar" />
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12.5px] font-medium text-white">{user?.email}</p>
            <p className="text-[10px] text-sidebar-foreground/60">Advertiser</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-[244px] flex-col bg-sidebar border-r border-sidebar-border">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-14 items-center justify-between px-4 bg-background/85 backdrop-blur-md border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
            <Logo size={12} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Karbali</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/wallet"
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Wallet"
          >
            <Wallet className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col bg-sidebar border-r border-sidebar-border lg:hidden animate-rise">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-[244px] min-w-0 flex flex-col">
        {/* Desktop topbar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-between border-b border-dashed border-border bg-background/80 backdrop-blur-md px-8">
          <nav
            className="flex items-center gap-2 text-[13px] text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <span>Workspace</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            <span className="text-foreground font-medium">
              {currentLink?.label || "Overview"}
            </span>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/campaigns/create"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 transition-all shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Launch a campaign
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 pt-20 pb-10 lg:px-10 lg:pt-8 lg:pb-14 min-w-0">
          {maintenanceMode && !walletActivated ? (
            <div className="mx-auto max-w-md flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight mb-1.5">Under development</h2>
              <p className="text-sm text-muted-foreground">
                This platform is currently under development. Please check back soon.
              </p>
            </div>
          ) : currentPageLocked ? (
            <div className="mx-auto max-w-md flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight mb-1.5">Access restricted</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">{lockReason}</p>
              {isWalletNotActivated && (
                <Link to="/wallet">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Wallet className="mr-2 h-4 w-4" /> Activate wallet
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
