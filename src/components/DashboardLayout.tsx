import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import {
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  FileText,
} from "lucide-react";

const advertiserLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns/create", label: "New Campaign", icon: Plus },
  { to: "/docs", label: "API Docs", icon: FileText },
];

const adminLinks = [
  { to: "/admin", label: "Admin Panel", icon: Shield },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen">
      <FluidCanvas />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col glass-strong">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-6">
          <Link to="/dashboard" className="text-xl font-bold">
            <span className="text-gradient">Karbali</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">
            Campaigns
          </p>
          {advertiserLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                location.pathname === link.to
                  ? "bg-primary/15 text-primary shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">
                Admin
              </p>
              {adminLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    location.pathname === link.to
                      ? "bg-primary/15 text-primary shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <p className="mb-2 truncate text-xs text-white/40">{user?.email}</p>
          <GlassButton variant="ghost" size="sm" className="w-full justify-start text-white/50" onClick={signOut}>
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
