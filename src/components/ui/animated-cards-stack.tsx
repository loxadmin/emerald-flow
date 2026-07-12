"use client"

import * as React from "react"

import { VariantProps, cva } from "class-variance-authority"
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionValue,
} from "motion/react"

import { cn } from "@/lib/utils"

const cardVariants = cva("absolute will-change-transform", {
  variants: {
    variant: {
      dark: "flex size-full flex-col items-center justify-center gap-6 rounded-2xl border border-stone-700/50 bg-accent-foreground/80 p-6 backdrop-blur-md",
      light:
        "flex size-full flex-col items-center justify-center gap-6 rounded-2xl border bg-accent bg-background/80 p-6 backdrop-blur-md ",
    },
  },
  defaultVariants: {
    variant: "light",
  },
})

interface ReviewProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number
  maxRating?: number
}

interface CardStickyProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof cardVariants> {
  arrayLength: number
  index: number
  incrementY?: number
  incrementZ?: number
  incrementRotation?: number
}

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>
}

const ContainerScrollContext = React.createContext<
  ContainerScrollContextValue | undefined
>(undefined)

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext)
  if (context === undefined) {
    throw new Error(
      "useContainerScrollContext must be used within a ContainerScrollContextProvider"
    )
  }
  return context
}

export const ContainerScroll: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ children, style, className, ...props }) => {
  const scrollYProgress = useMotionValue(0)

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        className={cn("relative w-full", className)}
        style={{ perspective: "1000px", ...style }}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  )
}
ContainerScroll.displayName = "ContainerScroll"

interface CardsContainerContextValue {
  activeIndex: number
  swipeDirection: "left" | "right"
  isSwiping: boolean
  hovered: boolean
  hoveredCardIndex: number | null
  setHoveredCardIndex: (index: number | null) => void
  isMobile: boolean
  totalCards: number
}

const CardsContainerContext = React.createContext<
  CardsContainerContextValue | undefined
>(undefined)

function useCardsContainer() {
  return React.useContext(CardsContainerContext)
}

export const CardsContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [swipeDirection, setSwipeDirection] = React.useState<"left" | "right">("left")
  const [isSwiping, setIsSwiping] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const [hoveredCardIndex, setHoveredCardIndex] = React.useState<number | null>(null)
  const [isMobile, setIsMobile] = React.useState(false)

  const totalCards = React.Children.count(children)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  React.useEffect(() => {
    if (hovered || totalCards <= 1) return

    const interval = setInterval(() => {
      setIsSwiping(true)
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % totalCards)
        setSwipeDirection((prev) => (prev === "left" ? "right" : "left"))
        setIsSwiping(false)
      }, 500)
    }, 3000)

    return () => clearInterval(interval)
  }, [hovered, totalCards])

  return (
    <CardsContainerContext.Provider
      value={{
        activeIndex,
        swipeDirection,
        isSwiping,
        hovered,
        hoveredCardIndex,
        setHoveredCardIndex,
        isMobile,
        totalCards,
      }}
    >
      <div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setHoveredCardIndex(null)
        }}
        onTouchStart={() => setHovered(true)}
        className={cn("relative", className)}
        style={{ perspective: "1000px", ...props.style }}
        {...props}
      >
        {children}
      </div>
    </CardsContainerContext.Provider>
  )
})
CardsContainer.displayName = "CardsContainer"

export const CardTransformed = React.forwardRef<
  HTMLDivElement,
  CardStickyProps
>(
  (
    {
      arrayLength,
      index,
      incrementY = 10,
      incrementZ = 10,
      incrementRotation = -index + 90,
      className,
      variant,
      style,
      ...props
    },
    ref
  ) => {
    const context = useCardsContainer()

    const activeIndex = context?.activeIndex ?? 0
    const swipeDirection = context?.swipeDirection ?? "left"
    const isSwiping = context?.isSwiping ?? false
    const hovered = context?.hovered ?? false
    const hoveredCardIndex = context?.hoveredCardIndex ?? null
    const setHoveredCardIndex = context?.setHoveredCardIndex ?? (() => {})
    const isMobile = context?.isMobile ?? false

    const cardZeroIndex = index - 1
    const relIndex = (cardZeroIndex - activeIndex + arrayLength) % arrayLength

    const isThisCardHovered = hoveredCardIndex === cardZeroIndex

    // Layout configuration when stacked (unhovered)
    let x = 0
    let y = relIndex * (isMobile ? 8 : 12)
    let scale = 1 - relIndex * 0.04
    let rotate = relIndex * -2
    let zIndex = (arrayLength - relIndex) * 10
    let opacity = 1 - relIndex * 0.15

    if (hovered) {
      // Spread layout
      const offsetFromCenter = cardZeroIndex - (arrayLength - 1) / 2

      // Horizontal spread sideways
      x = offsetFromCenter * (isMobile ? 55 : 120)

      // Beautiful arched vertical layout
      y = Math.abs(offsetFromCenter) * (isMobile ? 6 : 12)

      scale = isMobile ? 0.85 : 0.92
      rotate = offsetFromCenter * (isMobile ? 4 : 8)
      zIndex = (arrayLength - relIndex) * 10
      opacity = 1

      if (isThisCardHovered) {
        // Elevate hovered card
        scale = isMobile ? 0.92 : 1.02
        zIndex = 100
      }
    } else {
      // Stack layout state overrides
      if (cardZeroIndex === activeIndex && isSwiping) {
        // Swipe out sideways
        x = swipeDirection === "left" ? -280 : 280
        rotate = swipeDirection === "left" ? -12 : 12
        zIndex = arrayLength * 10 + 5
        opacity = 0.8
      }
    }

    return (
      <motion.div
        ref={ref}
        onMouseEnter={() => setHoveredCardIndex(cardZeroIndex)}
        onMouseLeave={() => setHoveredCardIndex(null)}
        animate={{
          x,
          y,
          scale,
          rotate,
          zIndex,
          opacity,
        }}
        transition={{
          type: "spring",
          stiffness: hovered ? 220 : 180,
          damping: hovered ? 20 : 22,
          mass: 1,
          zIndex: { duration: 0 },
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backfaceVisibility: "hidden",
          transformOrigin: "center center",
          ...style,
        }}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    )
  }
)
CardTransformed.displayName = "CardTransformed"

export const ReviewStars = React.forwardRef<HTMLDivElement, ReviewProps>(
  ({ rating, maxRating = 5, className, ...props }, ref) => {
    const filledStars = Math.floor(rating)
    const fractionalPart = rating - filledStars
    const emptyStars = maxRating - filledStars - (fractionalPart > 0 ? 1 : 0)

    return (
      <div
        className={cn("flex items-center gap-2", className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-center">
          {[...Array(filledStars)].map((_, index) => (
            <svg
              key={`filled-${index}`}
              className="size-4 text-inherit"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          ))}
          {fractionalPart > 0 && (
            <svg
              className="size-4 text-inherit"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <defs>
                <linearGradient id="half">
                  <stop
                    offset={`${fractionalPart * 100}%`}
                    stopColor="currentColor"
                  />
                  <stop
                    offset={`${fractionalPart * 100}%`}
                    stopColor="rgb(209 213 219)"
                  />
                </linearGradient>
              </defs>
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
                fill="url(#half)"
              />
            </svg>
          )}
          {[...Array(emptyStars)].map((_, index) => (
            <svg
              key={`empty-${index}`}
              className="size-4 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          ))}
        </div>
        <p className="sr-only">{rating}</p>
      </div>
    )
  }
)
ReviewStars.displayName = "ReviewStars"
