import { cn } from "@/lib/utils";

type KarbaliPersonaIconProps = {
  className?: string;
};

export default function KarbaliPersonaIcon({ className }: KarbaliPersonaIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="14" r="6" fill="currentColor" />
      <path
        d="M9 33c1.45-7.05 5.15-10.58 11-10.58S29.55 25.95 31 33H9Z"
        fill="currentColor"
      />
      <path
        d="M20 4c3.8 4.1 7.35 8.85 7.35 13.15 0 4.05-3.28 7.35-7.35 7.35s-7.35-3.3-7.35-7.35C12.65 12.85 16.2 8.1 20 4Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M20 7.8v13.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 16.5l4.8-2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 16.5l-4.8-2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}