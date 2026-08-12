import { cn } from "@/lib/utils";

/**
 * Pure-CSS wrapped gift box (Christmas-present style) used for ad packages.
 * Sizes are driven by the `size` prop so the same box works inline on cards
 * and large inside the reveal popup.
 */
export default function GiftBox({
  size = 88,
  shake = false,
  open = false,
  className,
}: {
  size?: number;
  shake?: boolean;
  open?: boolean;
  className?: string;
}) {
  const lid = Math.round(size * 0.24);
  const ribbon = Math.round(size * 0.16);

  return (
    <div
      className={cn("relative shrink-0", shake && "gift-shake", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* body */}
      <div
        className="absolute bottom-0 left-0 w-full rounded-b-xl rounded-t-sm bg-primary/90 shadow-lg"
        style={{ height: size - lid }}
      >
        <div
          className="absolute left-1/2 top-0 h-full -translate-x-1/2 bg-primary-foreground/85"
          style={{ width: ribbon }}
        />
      </div>

      {/* lid */}
      <div
        className={cn(
          "absolute left-[-6%] top-0 w-[112%] rounded-md bg-primary shadow-md transition-transform duration-700 ease-out",
          open && "gift-lid-open",
        )}
        style={{ height: lid }}
      >
        <div
          className="absolute left-1/2 top-0 h-full -translate-x-1/2 bg-primary-foreground/85"
          style={{ width: ribbon }}
        />
        {/* bow */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full flex items-end gap-0.5">
          <span
            className="block rounded-full border-[3px] border-primary bg-transparent"
            style={{ width: size * 0.22, height: size * 0.22 }}
          />
          <span
            className="block rounded-full border-[3px] border-primary bg-transparent"
            style={{ width: size * 0.22, height: size * 0.22 }}
          />
        </div>
      </div>
    </div>
  );
}
