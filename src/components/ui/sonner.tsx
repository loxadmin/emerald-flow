import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Global admin flag — set by AuthProvider. Defaults to false (safer).
declare global {
  interface Window {
    __KARBALI_IS_ADMIN__?: boolean;
  }
}

const GENERIC_ERROR = "Oops! Something went wrong";

type ToastFn = typeof sonnerToast;

// Wrap toast.error so non-admins see a generic message; the real error is logged.
const wrappedError: ToastFn["error"] = ((message: unknown, data?: unknown) => {
  const isAdmin = typeof window !== "undefined" && window.__KARBALI_IS_ADMIN__ === true;
  if (isAdmin) {
    return (sonnerToast.error as (m: unknown, d?: unknown) => string | number)(message, data);
  }
  // Log the real error for debugging but hide it from the user
  // eslint-disable-next-line no-console
  console.warn("[suppressed error]", message, data);
  return (sonnerToast.error as (m: unknown, d?: unknown) => string | number)(GENERIC_ERROR);
}) as ToastFn["error"];

// Re-export a proxied toast that overrides only `.error`
const toastProxy = new Proxy(sonnerToast, {
  get(target, prop, receiver) {
    if (prop === "error") return wrappedError;
    return Reflect.get(target, prop, receiver);
  },
  apply(target, thisArg, args: unknown[]) {
    return (target as unknown as (...a: unknown[]) => unknown).apply(thisArg, args);
  },
}) as ToastFn;

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
            "group toast pointer-events-auto flex items-center gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-3 text-foreground shadow-xl backdrop-blur-md ring-1 ring-black/5",
          title: "text-sm font-medium leading-tight",
          description: "text-xs text-muted-foreground leading-tight",
          actionButton:
            "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80",
          success:
            "group-[.toaster]:!border-primary/30 group-[.toaster]:!bg-primary/10 group-[.toaster]:!text-foreground",
          error:
            "group-[.toaster]:!border-destructive/30 group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-foreground",
          warning:
            "group-[.toaster]:!border-amber-500/30 group-[.toaster]:!bg-amber-500/10 group-[.toaster]:!text-foreground",
          info:
            "group-[.toaster]:!border-sky-500/30 group-[.toaster]:!bg-sky-500/10 group-[.toaster]:!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toastProxy as toast };
