import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

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

export { Toaster, toast };
