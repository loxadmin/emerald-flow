import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Plus,
  LogOut,
  Sun,
  Moon,
  FileText,
  Wallet,
  Menu,
  X,
  Lock,
  AlertCircle,
} from "lucide-react";
import Logo from "@/components/Logo";

const advertiserLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/docs", label: "API Docs", icon: FileText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if pages should be locked
  const isWalletNotActivated = walletActivated !== true;
  const isCategoryInactive = categoryStatus === "waiting_list";
  const isCategoryActive = categoryStatus === "active";

  // If category is inactive (waiting_list), only wallet is accessible
  // If category is active but wallet not activated, only wallet is accessible
  // If both active, all pages accessible
  const isPageLocked = (path: string) => {
    if (path === "/wallet") return false; // Wallet always accessible
    if (isCategoryInactive) return true; // Inactive category: lock everything except wallet
    if (isWalletNotActivated) return true; // Active category but no wallet: lock everything except wallet
    return false;
  };

  const getLockReason = () => {
    if (isCategoryInactive) return "Your category is not live yet. Please wait for activation.";
    if (isWalletNotActivated) return "Please activate your payment method first.";
    return "";
  };

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border/30 px-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Logo size={24} />
          <span className="text-gradient">Karbali</span>
        </Link>
        <button
          className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          Advertiser
        </p>
        {categoryStatus && (
          <div className="mb-3 px-3">
            <Badge variant="outline" className={
              isCategoryActive ? "border-primary/30 bg-primary/10 text-primary text-xs" :
              "border-warning/30 bg-warning/10 text-warning text-xs"
            }>
              {isCategoryActive ? "Category: Active" : "Category: Pending"}
            </Badge>
          </div>
        )}
        {advertiserLinks.map((link) => {
          const locked = isPageLocked(link.to);
          return (
            <Link
              key={link.to}
              to={locked ? "#" : link.to}
              onClick={(e) => {
                if (locked) {
                  e.preventDefault();
                  // Show inline message instead of navigating
                }
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                locked
                  ? "opacity-50 cursor-not-allowed text-muted-foreground"
                  : location.pathname === link.to
                    ? "bg-primary/15 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {locked && <Lock className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/30 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <GlassButton variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </GlassButton>
      </div>
    </>
  );

  // Check if current page is locked and show message
  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-64 flex-col glass-strong">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-14 items-center justify-between px-4 glass-strong border-b border-border/30">
        <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold">
          <Logo size={20} />
          <span className="text-gradient">Karbali</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col glass-strong lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="relative z-10 lg:ml-64 flex-1 p-4 pt-18 lg:p-8 lg:pt-8 min-w-0">
        {currentPageLocked ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 mb-4">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md mb-6">{lockReason}</p>
            {isWalletNotActivated && (
              <Link to="/wallet">
                <GlassButton variant="glow">
                  <Wallet className="mr-2 h-4 w-4" /> Go to Wallet
                </GlassButton>
              </Link>
            )}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
