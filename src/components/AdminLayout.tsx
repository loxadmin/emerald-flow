import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Shield, BarChart3, Settings, LogOut, Sun, Moon, PenSquare, Users, Layers,
  Wallet, Handshake, Menu, X, MessageSquare, Layout, Chrome, Gamepad2, ChevronRight, Send, Package, Flag, Zap, FileSignature, PenTool, GitBranch, Megaphone,
} from "lucide-react";

import Logo from "@/components/Logo";

const adminGroups: { label: string; links: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Overview",
    links: [
      { to: "/admin", label: "Dashboard", icon: Shield },
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    links: [
      { to: "/admin/advertisers", label: "Advertisers", icon: Users },
      { to: "/admin/categories", label: "Categories", icon: Layers },
      { to: "/admin/partnerships", label: "Partnerships", icon: Handshake },
      { to: "/admin/wallets", label: "Wallets", icon: Wallet },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare },
      { to: "/admin/broadcast", label: "Broadcast", icon: Send },
    ],
  },
  {
    label: "Content",
    links: [
      { to: "/admin/blogs", label: "Blogs", icon: PenSquare },
      { to: "/admin/content", label: "Site Content", icon: Layout },
      { to: "/admin/design", label: "Page Design", icon: Layers },
    ],
  },
  {
    label: "Products",
    links: [
      { to: "/admin/offerwall", label: "Offerwall", icon: Gamepad2 },
      { to: "/admin/loi", label: "Letters of Intent", icon: FileSignature },
      { to: "/admin/migration-opportunities", label: "Migration Opps", icon: GitBranch },
      { to: "/admin/signature", label: "Company Signature", icon: PenTool },
      { to: "/admin/packages", label: "Ad Packages", icon: Package },
      { to: "/admin/switch-offers", label: "Switch Offers", icon: Zap },
      { to: "/admin/milestones", label: "Milestones", icon: Flag },

      { to: "/admin/extension", label: "Extension", icon: Chrome },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allLinks = adminGroups.flatMap(g => g.links);
  const currentLink = allLinks.find(l => l.to === location.pathname);

  const sidebar = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <Link to="/admin" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Logo size={20} />
          <span>Karbali</span>
          <span className="ml-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
        </Link>
        <button
          className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {adminGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            {group.links.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-foreground/[0.06] text-foreground font-medium"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  <link.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
            {(user?.email || "?")[0].toUpperCase()}
          </div>
          <p className="flex-1 truncate text-xs text-foreground">{user?.email}</p>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-60 flex-col bg-card border-r border-border">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex lg:hidden h-12 items-center justify-between px-4 bg-card border-b border-border">
        <Link to="/admin" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={18} />
          <span>Karbali</span>
          <span className="ml-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
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
        <header className="hidden lg:flex sticky top-0 z-30 h-12 items-center gap-2 border-b border-border bg-background px-6">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{currentLink?.label || "Dashboard"}</span>
          </nav>
        </header>

        <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
