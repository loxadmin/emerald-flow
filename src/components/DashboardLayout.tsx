import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileTabBar from "@/components/MobileTabBar";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Plus,
  LogOut,
  Sun,
  Moon,
  FileText,
  Wallet,
  Lock,
  AlertCircle,
  Megaphone,
  Globe,
  Search,
  ChevronRight,
  Circle,
} from "lucide-react";
import Logo from "@/components/Logo";

type NavLink = {
  to: string;
  label: string;
  icon: any;
  description: string;
  hideForEngagement?: boolean;
};

const baseAdvertiserLinks: NavLink[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "Performance summary" },
  { to: "/ads", label: "Ads", icon: Megaphone, description: "Manage creatives" },
  { to: "/campaigns/create", label: "Create", icon: Plus, description: "Launch a campaign" },
  { to: "/websites", label: "Websites", icon: Globe, description: "Track verified domains", hideForEngagement: true },
  { to: "/wallet", label: "Wallet", icon: Wallet, description: "Funding and spend" },
  { to: "/docs", label: "API Docs", icon: FileText, description: "Integration guides", hideForEngagement: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, walletActivated, categoryStatus, maintenanceMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [advertiserType, setAdvertiserType] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAdvertiserType(null);
      return;
    }

    supabase
      .from("advertiser_categories")
      .select("advertiser_type")
      .eq("advertiser_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAdvertiserType((data as any)?.advertiser_type ?? null));
  }, [user?.id]);

  const isEngagement = advertiserType === "engagement";
  const advertiserLinks = useMemo(
    () => baseAdvertiserLinks.filter((link) => !(isEngagement && link.hideForEngagement)),
    [isEngagement],
  );

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
    if (isWalletNotActivated) return "Please activate your payment method first.";
    return "";
  };

  const currentLink = advertiserLinks.find((link) => location.pathname === link.to) ?? advertiserLinks[0];
  const currentPageLocked = isPageLocked(location.pathname);
  const lockReason = getLockReason();

  const mobileTabs = advertiserLinks.slice(0, 5).map((link) => ({
    to: link.to,
    label: link.label,
    icon: link.icon,
  }));

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-border bg-background lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Logo size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold">Karbali Ads</p>
              <p className="text-xs text-muted-foreground">Advertiser workspace</p>
            </div>
          </Link>
        </div>

        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Signed in advertiser</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {advertiserLinks.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            const locked = isPageLocked(link.to);

            return (
              <Link
                key={link.to}
                to={locked ? "#" : link.to}
                onClick={(event) => {
                  if (locked) event.preventDefault();
                }}
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${
                  active
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-transparent text-foreground hover:border-border hover:bg-card"
                } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary/15" : "bg-muted"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{link.label}</span>
                    {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{link.description}</p>
                </div>
                {!locked && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Access</p>
                <p className="text-sm font-medium">
                  {isCategoryActive ? "Live" : isCategoryInactive ? "Pending" : "Reviewing"}
                </p>
              </div>
              <Badge variant="outline" className={isCategoryActive ? "border-primary/20 text-primary" : ""}>
                {isCategoryActive ? "Active" : "Pending"}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className={`h-2.5 w-2.5 fill-current ${isWalletNotActivated ? "text-muted-foreground" : "text-primary"}`} />
              {isWalletNotActivated ? "Wallet activation needed" : "Wallet ready"}
            </div>
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

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:ml-[272px]">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Advertiser panel</p>
            <h1 className="truncate text-sm font-semibold">{currentLink?.label ?? "Workspace"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {advertiserType ? `${advertiserType} account` : "Advertiser account"}
            </Badge>
            <Link to="/campaigns/create" className="hidden sm:block">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pb-24 pt-4 lg:ml-[272px] lg:px-6 lg:pb-6">
        {maintenanceMode && !walletActivated ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Under Development</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This platform is currently under development. Please check back soon.
            </p>
          </div>
        ) : currentPageLocked ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{lockReason}</p>
            {isWalletNotActivated && (
              <Link to="/wallet" className="mt-4 inline-flex">
                <Button size="sm">
                  <Wallet className="mr-2 h-4 w-4" />
                  Go to Wallet
                </Button>
              </Link>
            )}
          </div>
        ) : (
          children
        )}
      </main>

      <MobileTabBar tabs={mobileTabs} />
    </div>
  );
}
