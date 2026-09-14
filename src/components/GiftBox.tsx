import { cn } from "@/lib/utils";

/**
 * Pure-CSS wrapped gift box (Christmas-present style) used for ad packages.
 * Sizes are driven by the `size` prop so the same box works inline on cards
 * and large inside the reveal popup.
 *
 * `tone` switches the wrapping colour: brand green (default) or the red box
 * used for one-off swift packages.
 */
export default function GiftBox({
  size = 88,
  shake = false,
  open = false,
  tone = "primary",
  className,
}: {
  size?: number;
  shake?: boolean;
  open?: boolean;
  tone?: "primary" | "red";
  className?: string;
}) {
  const lid = Math.round(size * 0.24);
  const ribbon = Math.round(size * 0.16);
  const red = tone === "red";

  const bodyBg = red ? "bg-destructive/90" : "bg-primary/90";
  const lidBg = red ? "bg-destructive" : "bg-primary";
  const ribbonBg = red ? "bg-background/85" : "bg-primary-foreground/85";
  const bowBorder = red ? "border-destructive" : "border-primary";

  return (
    <div
      className={cn("relative shrink-0", shake && "gift-shake", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* body */}
      <div
        className={cn("absolute bottom-0 left-0 w-full rounded-b-xl rounded-t-sm shadow-lg", bodyBg)}
        style={{ height: size - lid }}
      >
        <div
          className={cn("absolute left-1/2 top-0 h-full -translate-x-1/2", ribbonBg)}
          style={{ width: ribbon }}
        />
      </div>

      {/* lid */}
      <div
        className={cn(
          "absolute left-[-6%] top-0 w-[112%] rounded-md shadow-md transition-transform duration-700 ease-out",
          lidBg,
          open && "gift-lid-open",
        )}
        style={{ height: lid }}
      >
        <div
          className={cn("absolute left-1/2 top-0 h-full -translate-x-1/2", ribbonBg)}
          style={{ width: ribbon }}
        />
        {/* bow */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full flex items-end gap-0.5">
          <span
            className={cn("block rounded-full border-[3px] bg-transparent", bowBorder)}
            style={{ width: size * 0.22, height: size * 0.22 }}
          />
          <span
            className={cn("block rounded-full border-[3px] bg-transparent", bowBorder)}
            style={{ width: size * 0.22, height: size * 0.22 }}
          />
        </div>
      </div>
    </div>
  );
}
