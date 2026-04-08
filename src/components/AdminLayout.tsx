import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import {
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  PenSquare,
  Users,
  Layers,
  Wallet,
  Handshake,
  Menu,
  X,
  MessageSquare,
  Layout,
} from "lucide-react";
import Logo from "@/components/Logo";

const adminLinks = [
  { to: "/admin", label: "Overview", icon: Shield },
  { to: "/admin/advertisers", label: "Advertisers", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: Layers },
  { to: "/admin/partnerships", label: "Partnerships", icon: Handshake },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/wallets", label: "Wallets", icon: Wallet },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/content", label: "Site Content", icon: PenSquare },
  { to: "/admin/design", label: "Page Design", icon: Layout },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border/30 px-6">
        <Link to="/admin" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Logo size={24} />
          <span className="text-gradient">Karbali Ads</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
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
          Management
        </p>
        {adminLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setMobileMenuOpen(false)}
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

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-64 flex-col glass-strong">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-14 items-center justify-between px-4 glass-strong border-b border-border/30">
        <Link to="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Logo size={20} />
          <span className="text-gradient text-xs">Karbali Ads</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
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
        {children}
      </main>
    </div>
  );
}
