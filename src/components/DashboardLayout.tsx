import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useAiMode } from "@/lib/ai-mode";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Menu, X, Lock, AlertCircle, Megaphone, Globe, ChevronRight,
  ShieldCheck, Package, ClipboardList, Zap,
} from "lucide-react";

import Logo from "@/components/Logo";
import KarbaliAssistant from "@/components/KarbaliAssistant";
import KarbaliPersonaIcon from "@/components/KarbaliPersonaIcon";

type NavLink = {
  to: string;
  label: string;
  icon: any;
  group: string;
  hideForEngagement?: boolean;
  hideForOffline?: boolean;
  onlyForOffline?: boolean;
};

const baseAdvertiserLinks: NavLink[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { to: "/ads", label: "Campaigns", icon: Megaphone, group: "Workspace", hideForOffline: true },
  { to: "/campaigns/create", label: "New campaign", icon: Plus, group: "Workspace", hideForOffline: true },
  { to: "/packages", label: "Ad packages", icon: Package, group: "Workspace", hideForOffline: true },
  { to: "/offline/verify", label: "Business verification", icon: ShieldCheck, group: "Workspace", onlyForOffline: true },
  { to: "/offline/offers", label: "My offers", icon: Package, group: "Workspace", onlyForOffline: true },
  { to: "/offline/orders", label: "Orders", icon: ClipboardList, group: "Workspace", onlyForOffline: true },
  { to: "/websites", label: "Websites", icon: Globe, hideForEngagement: true, hideForOffline: true, group: "Account" },
  { to: "/wallet", label: "Wallet", icon: Wallet, group: "Account" },
  { to: "/docs", label: "API & Docs", icon: FileText, hideForEngagement: true, hideForOffline: true, group: "Account" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus, maintenanceMode, advertiserType, businessVerified } = useAuth();

  const isEngagement = advertiserType === "engagement";
  const isOffline = advertiserType === "offline";
  const advertiserLinks = baseAdvertiserLinks.filter((link) => {
    if (isEngagement && link.hideForEngagement) return false;
    if (isOffline && link.hideForOffline) return false;
    if (!isOffline && link.onlyForOffline) return false;
    return true;
  });
  const { theme, toggleTheme } = useTheme();
  const { setAiMode } = useAiMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const enableAiMode = () => {
    setAiMode(true);
    navigate("/ai");
  };


  const isWalletNotActivated = walletActivated !== true;
  const isCategoryInactive = categoryStatus === "waiting_list";
  const isPageLocked = (path: string) => {
    if (path === "/wallet" || path === "/docs" || path === "/websites") return false;
    if (path === "/offline/verify") return false;
    if (isOffline && (path === "/offline/offers" || path === "/offline/orders")) {
      if (isCategoryInactive) return true;
      if (isWalletNotActivated) return true;
      if (businessVerified !== true) return true;
      return false;
    }
    if (isCategoryInactive) return true;
    if (isWalletNotActivated) return true;
    return false;
  };

  const getLockReason = () => {
    if (isCategoryInactive) return "Your category is not live yet. Please wait for activation.";
    if (isWalletNotActivated) return "Activate your wallet to unlock the rest of your workspace.";
    if (isOffline && businessVerified !== true) return "Submit your business verification documents to unlock offers and orders.";
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
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Logo size={14} />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-tight text-foreground">Karbali</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Advertiser</p>
          </div>
        </Link>
        <button
          className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4">
        <div className="section-divider" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => {
          const links = advertiserLinks.filter((l) => l.group === group);
          if (!links.length) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
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
                    className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      locked
                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : active
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                    )}
                    <link.icon
                      className={`h-[15px] w-[15px] shrink-0 ${
                        active ? "text-primary" : ""
                      }`}
                    />
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
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12.5px] font-medium text-foreground">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Advertiser</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-14 items-center justify-between px-4 bg-background border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
            <Logo size={12} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Karbali</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={enableAiMode}
            className="rounded-md p-2 text-primary hover:bg-accent transition-colors"
            aria-label="AI mode"
            title="AI mode"
          >
            <KarbaliPersonaIcon className="h-4 w-4" />
          </button>
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
            className="fixed inset-0 z-50 bg-black/70 lg:hidden animate-fade-in"
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
        <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-between border-b border-border bg-background px-8">
          <nav
            className="flex items-center gap-2 text-[13px] text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <span>Workspace</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">
              {currentLink?.label || "Overview"}
            </span>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={enableAiMode}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
              title="Switch to AI chat mode"
            >
              <KarbaliPersonaIcon className="h-3.5 w-3.5" />
              AI mode
            </button>
            <Link
              to="/campaigns/create"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
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
      <KarbaliAssistant />
    </div>
  );
}
