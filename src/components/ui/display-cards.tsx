"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  solid?: boolean;
}

export function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-emerald-600 dark:text-emerald-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-emerald-500",
  titleClassName = "text-emerald-600 dark:text-emerald-400",
  solid = true,
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 px-4 py-3 transition-all duration-700 hover:border-emerald-500/30 hover:bg-muted/30 [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        solid
          ? "bg-card opacity-100 border-border"
          : "bg-muted/70 backdrop-blur-sm border-border after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-['']",
        className
      )}
    >
      <div>
        <span className={cn("relative inline-block rounded-full p-1.5", solid ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-blue-800")}>
          {icon}
        </span>
        <p className={cn("text-lg font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-lg text-foreground font-semibold">{description}</p>
      <p className="text-muted-foreground text-sm">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "[grid-area:stack] opacity-75 grayscale hover:-translate-y-10 hover:opacity-100 hover:grayscale-0",
    },
    {
      className: "[grid-area:stack] translate-x-16 translate-y-10 opacity-85 grayscale hover:-translate-y-1 hover:opacity-100 hover:grayscale-0",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
