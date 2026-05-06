import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

export interface MobileTab {
  to: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
}

interface Props {
  tabs: MobileTab[];
}

export default function MobileTabBar({ tabs }: Props) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const isActive = t.active ?? pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to + t.label}>
              {t.onClick ? (
                <button
                  onClick={t.onClick}
                  className={`flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-none">{t.label}</span>
                </button>
              ) : (
                <Link
                  to={t.to}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-none">{t.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
