import * as React from "react";
import { cn } from "@/lib/utils";

const GlassInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-foreground/90 backdrop-blur-lg",
        "ring-offset-transparent placeholder:text-muted-foreground/50",
        "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:bg-white/[0.06] focus-visible:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        "transition-all duration-300 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground/70",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
GlassInput.displayName = "GlassInput";

export { GlassInput };
