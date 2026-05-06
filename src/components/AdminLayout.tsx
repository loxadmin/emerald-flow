import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import FluidCanvas from "@/components/FluidCanvas";
import MobileTabBar from "@/components/MobileTabBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Shield, BarChart3, Settings, LogOut, Sun, Moon, PenSquare,
  Users, Layers, Wallet, Handshake, MessageSquare, Layout,
  Chrome, Gamepad2, MoreHorizontal, Home,
} from "lucide-react";
import Logo from "@/components/Logo";

type NavItem = { to: string; label: string; icon: any };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: Shield },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/advertisers", label: "Advertisers", icon: Users },
      { to: "/admin/categories", label: "Categories", icon: Layers },
      { to: "/admin/partnerships", label: "Partnerships", icon: Handshake },
      { to: "/admin/wallets", label: "Wallets", icon: Wallet },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/blogs", label: "Blogs", icon: PenSquare },
      { to: "/admin/content", label: "Site Content", icon: Layout },
      { to: "/admin/design", label: "Page Design", icon: Layers },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/admin/offerwall", label: "Offerwall", icon: Gamepad2 },
      { to: "/admin/extension", label: "Extension", icon: Chrome },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const mobilePrimary = [
  { to: "/admin", label: "Home", icon: Home },
  { to: "/admin/advertisers", label: "Advertisers", icon: Users },
  { to: "/admin/wallets", label: "Wallets", icon: Wallet },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) => pathname === to;

  const SidebarBody = (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Link to="/admin" className="flex items-center gap-2 font-semibold">
          <Logo size={20} />
          <span className="text-sm">Karbali</span>
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                      isActive(item.to)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-56 flex-col bg-card/90 backdrop-blur-xl border-r border-border">
        {SidebarBody}
      </aside>

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex lg:hidden h-12 items-center justify-between px-4 bg-card/90 backdrop-blur-xl border-b border-border">
        <Link to="/admin" className="flex items-center gap-2 text-sm font-semibold">
          <Logo size={18} />
          <span>Karbali</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">Admin</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 lg:ml-56 flex-1 p-4 pt-16 pb-20 lg:p-6 lg:pt-6 lg:pb-6 min-w-0">
        {children}
      </main>

      {/* Mobile bottom tabs + More sheet */}
      <MobileTabBar
        tabs={[
          ...mobilePrimary,
          {
            to: "#more",
            label: "More",
            icon: MoreHorizontal,
            active: moreOpen,
            onClick: () => setMoreOpen(true),
          },
        ]}
      />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent side="bottom" className="lg:hidden max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>All sections</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm ${
                          isActive(item.to) ? "text-primary border-primary/30" : "text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
