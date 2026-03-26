import { cn } from "@/lib/utils";
import { useId } from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 32 }: LogoProps) {
  const gradientId = useId();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <defs>
          <linearGradient id={gradientId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="hsl(160, 60%, 55%)" />
            <stop offset="50%" stopColor="hsl(160, 60%, 35%)" />
            <stop offset="100%" stopColor="hsl(160, 60%, 15%)" />
          </linearGradient>
        </defs>

        {/* Main Leaf Shape */}
        <path
          d="M 50 2 C 70 25 90 55 90 75 A 40 30 0 0 1 10 75 C 10 55 30 25 50 2 Z"
          fill={`url(#${gradientId})`}
        />

        {/* Central Spine */}
        <line
          x1="50"
          y1="2"
          x2="50"
          y2="95"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Venation */}
        <g stroke="rgba(0,0,0,0.25)" strokeWidth="1" fill="none" strokeLinecap="round">
          <path d="M 50 35 L 75 25" />
          <path d="M 50 55 L 80 45" />
          <path d="M 50 75 L 82 65" />

          <path d="M 50 35 L 25 25" />
          <path d="M 50 55 L 20 45" />
          <path d="M 50 75 L 18 65" />
        </g>

        {/* Glass Highlight */}
        <path
          d="M 35 20 C 20 40 20 70 40 85"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="opacity-60"
        />
      </svg>
    </div>
  );
}
