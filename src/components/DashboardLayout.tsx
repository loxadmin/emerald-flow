import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import FluidCanvas from "@/components/FluidCanvas";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Plus, LogOut, Sun, Moon, FileText, Wallet,
  Menu, X, Lock, AlertCircle,
} from "lucide-react";
import Logo from "@/components/Logo";

const advertiserLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/docs", label: "API Docs", icon: FileText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isWalletNotActivated = walletActivated !== true;
  const isCategoryInactive = categoryStatus === "waiting_list";
  const isCategoryActive = categoryStatus === "active";

  const isPageLocked = (path: string) => {
    if (path === "/wallet" || path === "/docs") return false;
    if (isCategoryInactive) return true;
    if (isWalletNotActivated) return true;
    return false;
  };

  const getLockReason = () => {
    if (isCategoryInactive) return "Your category is not live yet. Please wait for activation.";
    if (isWalletNotActivated) return "Please activate your payment method first.";
    return "";
  };

  const sidebar = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <Link to="/dashboard" className="flex items-center gap-2 text-base font-semibold">
          <Logo size={20} />
          <span className="text-gradient">Karbali</span>
        </Link>
        <button className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Menu</p>
        {categoryStatus && (
          <div className="mb-2 px-3">
            <Badge variant="outline" className={`text-[10px] font-normal ${isCategoryActive ? "text-primary border-primary/20" : "text-amber-600 border-amber-500/20"}`}>
              {isCategoryActive ? "Category: Active" : "Category: Pending"}
            </Badge>
          </div>
        )}
        {advertiserLinks.map((link) => {
          const locked = isPageLocked(link.to);
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={locked ? "#" : link.to}
              onClick={(e) => { if (locked) e.preventDefault(); setMobileMenuOpen(false); }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                locked ? "opacity-40 cursor-not-allowed text-muted-foreground" :
                active ? "bg-primary/10 text-primary font-medium" :
                "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {locked && <Lock className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center justify-between px-2">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <button onClick={toggleTheme} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
        </Button>
      </div>
    </>
  );

  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-56 flex-col bg-card/80 backdrop-blur-xl border-r border-border">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-12 items-center justify-between px-4 bg-card/80 backdrop-blur-xl border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={18} />
          <span className="text-gradient">Karbali</span>
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
      <main className="relative z-10 lg:ml-56 flex-1 p-4 pt-16 lg:p-6 lg:pt-6 min-w-0">
        {currentPageLocked ? (
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
  );
}
