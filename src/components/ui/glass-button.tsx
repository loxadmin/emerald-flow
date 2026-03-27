import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.95]",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-primary/20 text-foreground backdrop-blur-lg hover:bg-primary/30 hover:brightness-110 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]",
        secondary:
          "border border-white/[0.1] bg-white/[0.08] text-foreground/80 backdrop-blur-lg hover:bg-white/[0.12] hover:text-foreground hover:brightness-110",
        ghost:
          "text-muted-foreground hover:bg-white/[0.08] hover:text-foreground/90",
        destructive:
          "border border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-300 backdrop-blur-lg hover:bg-red-500/25",
        glow:
          "border border-primary/40 bg-primary/25 text-foreground backdrop-blur-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-primary/35 hover:brightness-110",
        outline:
          "border border-black/[0.15] dark:border-white/[0.15] bg-transparent text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground backdrop-blur-lg hover:brightness-110",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
