import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Menu, X, Lock, AlertCircle, Megaphone, Globe, ChevronDown,
  Sparkles, ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  hideForEngagement?: boolean;
  children?: { to: string; label: string }[];
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      {
        label: "Campaigns", icon: Megaphone,
        children: [
          { to: "/ads", label: "All campaigns" },
          { to: "/campaigns/create", label: "New campaign" },
        ],
      },
      { to: "/websites", label: "Websites", icon: Globe, hideForEngagement: true },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/docs", label: "API & Docs", icon: FileText, hideForEngagement: true },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus, maintenanceMode } = useAuth();
  const [advertiserType, setAdvertiserType] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Campaigns: true });

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

  const filterItems = (items: NavItem[]) =>
    items.filter((i) => !(isEngagement && i.hideForEngagement));

  const isActive = (path?: string) => path && location.pathname === path;
  const initial = (user?.email || "?")[0].toUpperCase();
  const emailName = (user?.email || "").split("@")[0];

  const currentLabel = (() => {
    for (const g of navGroups) {
      for (const i of g.items) {
        if (i.to && isActive(i.to)) return i.label;
        if (i.children) {
          const c = i.children.find((c) => c.to === location.pathname);
          if (c) return c.label;
        }
      }
    }
    return "Overview";
  })();

  const sidebar = (
    <>
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Logo size={16} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Karbali</span>
        </Link>
        <button
          className="lg:hidden rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Avatar tile (Termii-style) */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-secondary/40 px-3 py-2.5">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground capitalize">{emailName || "Advertiser"}</p>
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {isCategoryActive ? "Active" : "Pending"}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Status pill */}
      {categoryStatus && (
        <div className="px-4 pb-3">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${
              isCategoryActive
                ? "border-primary/25 bg-primary/[0.06] text-primary"
                : "border-amber-500/25 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isCategoryActive ? "bg-primary" : "bg-amber-500"} animate-pulse`} />
            <span className="font-medium">
              {isCategoryActive ? "Workspace active" : "Workspace pending"}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-5">
        {navGroups.map((group) => {
          const items = filterItems(group.items);
          if (!items.length) return null;
          return (
            <div key={group.label} className="space-y-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </p>
              {items.map((item) => {
                if (item.children) {
                  const open = openGroups[item.label] ?? item.children.some((c) => c.to === location.pathname);
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => setOpenGroups((s) => ({ ...s, [item.label]: !open }))}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
                      >
                        <item.icon className="h-[15px] w-[15px] shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                      </button>
                      {open && (
                        <div className="ml-7 mt-0.5 border-l border-dashed border-sidebar-border pl-3 space-y-0.5">
                          {item.children.map((c) => {
                            const locked = isPageLocked(c.to);
                            const active = isActive(c.to);
                            return (
                              <Link
                                key={c.to}
                                to={locked ? "#" : c.to}
                                onClick={(e) => { if (locked) e.preventDefault(); setMobileMenuOpen(false); }}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                                  locked ? "opacity-40 cursor-not-allowed text-muted-foreground"
                                    : active ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                }`}
                              >
                                <span className="flex-1">{c.label}</span>
                                {locked && <Lock className="h-3 w-3" />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const locked = isPageLocked(item.to!);
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={locked ? "#" : item.to!}
                    onClick={(e) => { if (locked) e.preventDefault(); setMobileMenuOpen(false); }}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                      locked ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : active ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {locked && <Lock className="h-3 w-3" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between rounded-lg px-2">
          <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={signOut}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-[256px] flex-col bg-sidebar border-r border-sidebar-border">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-14 items-center justify-between px-4 bg-background/85 backdrop-blur-md border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Logo size={13} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Karbali</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/wallet" className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Wallet">
            <Wallet className="h-4 w-4" />
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col bg-sidebar border-r border-sidebar-border lg:hidden animate-rise">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-[256px] min-w-0 flex flex-col">
        {/* Desktop topbar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-8">
          <nav className="flex items-center gap-2 text-[13px] text-muted-foreground" aria-label="Breadcrumb">
            <span>Workspace</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            <span className="text-foreground font-medium">{currentLabel}</span>
          </nav>
          <Link to="/campaigns/create">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Launch campaign
            </Button>
          </Link>
        </header>

        <main className="flex-1 px-4 pt-20 pb-10 lg:px-10 lg:pt-8 lg:pb-14 min-w-0">
          {maintenanceMode && !walletActivated ? (
            <div className="mx-auto max-w-md flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight mb-1.5">Under development</h2>
              <p className="text-sm text-muted-foreground">This platform is currently under development. Please check back soon.</p>
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
                  <Button size="sm"><Wallet className="mr-2 h-4 w-4" /> Activate wallet</Button>
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
