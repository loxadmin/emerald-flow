import { cn } from "@/lib/utils";
import { useId } from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 32 }: LogoProps) {
  const glowId = useId();
  const dotId = useId();

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        role="img"
        aria-label="Karbali animated logo"
        className="drop-shadow-sm select-none"
      >
        <title>Karbali animated logo</title>
        <defs>
          <radialGradient id={glowId} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="hsl(160, 78%, 45%)" />
            <stop offset="45%" stopColor="hsl(160, 84%, 32%)" />
            <stop offset="100%" stopColor="hsl(160, 84%, 14%)" />
          </radialGradient>
          <radialGradient id={dotId} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="hsl(160, 70%, 90%)" />
          </radialGradient>
        </defs>

        {/* Dark Emerald Disc */}
        <circle cx="32" cy="32" r="31" fill={`url(#${glowId})`} />
        <circle
          cx="32"
          cy="32"
          r="30.5"
          fill="none"
          stroke="hsl(160, 84%, 14%)"
          strokeOpacity="0.4"
          strokeWidth="0.6"
        />

        {/* White orbit ring */}
        <circle
          cx="35"
          cy="36"
          r="13.5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.78"
          strokeWidth="2.6"
        >
          <animate
            attributeName="stroke-opacity"
            values="0.78;0.95;0.78"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Highlight dot orbiting the ring */}
        <g>
          <circle cx="35" cy="22.5" r="6.6" fill={`url(#${dotId})`}>
            <animate
              attributeName="r"
              values="6.6;7.4;6.6"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-45 35 36"
            to="315 35 36"
            dur="16s"
            repeatCount="indefinite"
          />
        </g>
      </svg>
    </div>
  );
}
