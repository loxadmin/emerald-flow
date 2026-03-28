import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import {
  LayoutDashboard,
  Plus,
  LogOut,
  Sun,
  Moon,
  FileText,
  Wallet,
} from "lucide-react";
import Logo from "@/components/Logo";

const advertiserLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/docs", label: "API Docs", icon: FileText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col glass-strong">
        <div className="flex h-16 items-center border-b border-border/30 px-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Logo size={24} />
            <span className="text-gradient">Karbali</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Campaigns
          </p>
          {advertiserLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                location.pathname === link.to
                  ? "bg-primary/15 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
              {adminLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    location.pathname === link.to
                      ? "bg-primary/15 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </>
          )}
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
      </aside>

      {/* Main content */}
      <main className="relative z-10 ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
