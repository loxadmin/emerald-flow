import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

interface AuthSplitShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthSplitShell({ title, description, children, footer }: AuthSplitShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — full-bleed video/image panel */}
      <div className="relative hidden w-[45%] overflow-hidden lg:block">
        <video
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Subtle dark overlay */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Right — form panel */}
      <div className="relative flex flex-1 flex-col overflow-y-auto">
        {/* Close / back to home */}
        <div className="flex items-center justify-between px-6 pt-4 sm:px-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <Logo size={24} />
            <span className="text-lg font-bold tracking-tight text-gradient">KARBALI ADS</span>
          </Link>
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-16">
          <div className="w-full max-w-sm">
            <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-center text-sm text-muted-foreground">
              {description}
            </p>

            <div className="mt-6">{children}</div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
