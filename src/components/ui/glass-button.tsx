import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-primary/20 text-white backdrop-blur-lg hover:bg-primary/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        secondary:
          "border border-white/[0.08] bg-white/[0.06] text-white/80 backdrop-blur-lg hover:bg-white/[0.1] hover:text-white",
        ghost:
          "text-white/60 hover:bg-white/[0.06] hover:text-white/90",
        destructive:
          "border border-red-500/30 bg-red-500/15 text-red-300 backdrop-blur-lg hover:bg-red-500/25",
        glow:
          "border border-primary/40 bg-primary/20 text-white backdrop-blur-lg shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-primary/30",
        outline:
          "border border-white/[0.12] bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white backdrop-blur-lg",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
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
