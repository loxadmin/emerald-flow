import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileTabBar from "@/components/MobileTabBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  MessageSquare,
  Layout,
  Chrome,
  Gamepad2,
  MoreHorizontal,
  Home,
  ChevronRight,
  Search,
} from "lucide-react";
import Logo from "@/components/Logo";

type NavItem = { to: string; label: string; icon: any; description: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: Shield, description: "Platform snapshot" },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3, description: "Trends and traffic" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/advertisers", label: "Advertisers", icon: Users, description: "Accounts and status" },
      { to: "/admin/categories", label: "Categories", icon: Layers, description: "Onboarding structure" },
      { to: "/admin/partnerships", label: "Partnerships", icon: Handshake, description: "Partner approvals" },
      { to: "/admin/wallets", label: "Wallets", icon: Wallet, description: "Funding and balance" },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare, description: "Support conversations" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/blogs", label: "Blogs", icon: PenSquare, description: "Public content" },
      { to: "/admin/content", label: "Site Content", icon: Layout, description: "Landing page sections" },
      { to: "/admin/design", label: "Page Design", icon: Layers, description: "Visual settings" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/admin/offerwall", label: "Offerwall", icon: Gamepad2, description: "Reward inventory" },
      { to: "/admin/extension", label: "Extension", icon: Chrome, description: "Browser tools" },
      { to: "/admin/settings", label: "Settings", icon: Settings, description: "System controls" },
    ],
  },
];

const mobilePrimary = [
  { to: "/admin", label: "Home", icon: Home },
  { to: "/admin/advertisers", label: "Accounts", icon: Users },
  { to: "/admin/wallets", label: "Wallets", icon: Wallet },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) => pathname === to;
  const flatItems = navGroups.flatMap((group) => group.items);
  const currentItem = flatItems.find((item) => item.to === pathname) ?? flatItems[0];

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[288px] border-r border-border bg-background lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-4">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Logo size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Karbali</p>
                <Badge variant="outline" className="border-primary/20 text-primary">Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Operations workspace</p>
            </div>
          </Link>
        </div>

        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Admin account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${
                      active
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-transparent text-foreground hover:border-border hover:bg-card"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary/15" : "bg-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="mt-1 text-sm font-medium">Platform administration</p>
            <p className="mt-1 text-xs text-muted-foreground">Campaign approvals, content, wallets, and monitoring.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 justify-center" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:ml-[288px]">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Admin panel</p>
            <h1 className="truncate text-sm font-semibold">{currentItem?.label ?? "Dashboard"}</h1>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex border-primary/20 text-primary">
            Internal tools
          </Badge>
        </div>
      </header>

      <main className="px-4 pb-24 pt-4 lg:ml-[288px] lg:px-6 lg:pb-6">{children}</main>

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
        <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto lg:hidden">
          <SheetHeader>
            <SheetTitle>Admin sections</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{group.label}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                          active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-card"
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary/15" : "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
