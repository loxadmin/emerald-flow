import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface DisplayCardProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  className?: string;
}

export function DisplayCard({
  icon = <Sparkles className="size-4" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName,
  titleClassName,
  className,
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-40 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 border-foreground bg-card px-5 py-4 transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-[''] hover:border-primary/60 hover:bg-card [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className,
      )}
    >
      <div>
        <span className={cn("relative inline-block rounded-full bg-primary/10 p-1.5", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-lg font-bold", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-base text-muted-foreground">{description}</p>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards: DisplayCardProps[] = [
    { className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-full before:h-full before:rounded-xl before:bg-background/60 before:content-[''] grayscale hover:grayscale-0 hover:before:opacity-0 before:transition-opacity before:duration-700" },
    { className: "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-full before:h-full before:rounded-xl before:bg-background/60 before:content-[''] grayscale hover:grayscale-0 hover:before:opacity-0 before:transition-opacity before:duration-700" },
    { className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10" },
  ];
  const list = cards ?? defaultCards;
  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
      {list.map((card, i) => (
        <DisplayCard key={i} {...card} />
      ))}
    </div>
  );
}
