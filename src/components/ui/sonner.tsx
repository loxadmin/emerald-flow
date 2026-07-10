import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

declare global {
  interface Window {
    __KARBALI_IS_ADMIN__?: boolean;
  }
}

const GENERIC_ERROR = "Oops! Something went wrong";

// Monkey-patch toast.error globally so even files that import directly
// from "sonner" get the suppressed message for non-admins.
type ErrorFn = typeof toast.error;
const sonnerToast = toast as typeof toast & { __karbaliPatched?: boolean };
if (!sonnerToast.__karbaliPatched) {
  const originalError = toast.error.bind(toast) as ErrorFn;
  const patched: ErrorFn = ((message: unknown, data?: unknown) => {
    const isAdmin = typeof window !== "undefined" && window.__KARBALI_IS_ADMIN__ === true;
    if (isAdmin) {
      return (originalError as (m: unknown, d?: unknown) => string | number)(message, data);
    }
    // eslint-disable-next-line no-console
    console.warn("[suppressed error]", message, data);
    return (originalError as (m: unknown, d?: unknown) => string | number)(GENERIC_ERROR);
  }) as ErrorFn;
  (toast as { error: ErrorFn }).error = patched;
  sonnerToast.__karbaliPatched = true;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-2xl ring-1 ring-black/5",
          title: "text-sm font-medium leading-tight",
          description: "text-xs text-muted-foreground leading-tight",
          actionButton:
            "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80",
          success:
            "group-[.toaster]:!border-emerald-600 group-[.toaster]:!bg-emerald-600 group-[.toaster]:!text-white",
          error:
            "group-[.toaster]:!border-destructive group-[.toaster]:!bg-destructive group-[.toaster]:!text-destructive-foreground",
          warning:
            "group-[.toaster]:!border-amber-500 group-[.toaster]:!bg-amber-500 group-[.toaster]:!text-white",
          info:
            "group-[.toaster]:!border-sky-600 group-[.toaster]:!bg-sky-600 group-[.toaster]:!text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
