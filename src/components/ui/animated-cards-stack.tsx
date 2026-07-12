"use client"

import * as React from "react"
import { VariantProps, cva } from "class-variance-authority"
import { HTMLMotionProps, motion } from "motion/react"
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
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  isHovered: boolean
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>
  arrayLength: number
  setArrayLength: React.Dispatch<React.SetStateAction<number>>
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
  React.HTMLAttributes<HTMLDivElement> & { arrayLength?: number }
> = ({ children, style, className, arrayLength: propArrayLength = 4, ...props }) => {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const [arrayLength, setArrayLength] = React.useState(propArrayLength)

  React.useEffect(() => {
    if (propArrayLength !== arrayLength) {
      setArrayLength(propArrayLength)
    }
  }, [propArrayLength])

  React.useEffect(() => {
    if (isHovered) return // Pause auto-swipe on hover so user can read
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % arrayLength)
    }, 3200)
    return () => clearInterval(interval)
  }, [isHovered, arrayLength])

  return (
    <ContainerScrollContext.Provider
      value={{ activeIndex, setActiveIndex, isHovered, setIsHovered, arrayLength, setArrayLength }}
    >
      <div
        className={cn("relative w-full", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={style}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  )
}
ContainerScroll.displayName = "ContainerScroll"

export const CardsContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: "1000px", ...props.style }}
      {...props}
    >
      {children}
    </div>
  )
}
CardsContainer.displayName = "CardsContainer"

export const CardTransformed = React.forwardRef<
  HTMLDivElement,
  CardStickyProps
>(
  (
    {
      arrayLength: propArrayLength,
      index,
      incrementY = 12,
      incrementZ = 14,
      incrementRotation = -5,
      className,
      variant,
      style,
      ...props
    },
    ref
  ) => {
    const { activeIndex, isHovered, arrayLength, setArrayLength } = useContainerScrollContext()

    React.useEffect(() => {
      if (propArrayLength && propArrayLength !== arrayLength) {
        setArrayLength(propArrayLength)
      }
    }, [propArrayLength, arrayLength, setArrayLength])

    const cardIndex = index - 1
    const offset = (cardIndex - activeIndex + arrayLength) % arrayLength

    // Track previous offset to detect swiping from front to back
    const prevOffsetRef = React.useRef(offset)
    const [isSwiping, setIsSwiping] = React.useState(false)

    React.useEffect(() => {
      const prevOffset = prevOffsetRef.current
      if (prevOffset === 0 && offset === arrayLength - 1) {
        setIsSwiping(true)
        const timer = setTimeout(() => {
          setIsSwiping(false)
        }, 600)
        return () => clearTimeout(timer)
      }
      prevOffsetRef.current = offset
    }, [offset, arrayLength])

    // Responsive swipe distance
    const [swipeDistance, setSwipeDistance] = React.useState(220)
    React.useEffect(() => {
      const handleResize = () => {
        setSwipeDistance(window.innerWidth < 640 ? 120 : 220)
      }
      handleResize()
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [])

    // Stack layout: spread out more on hover
    const baseOffset = isHovered ? 26 : 12
    const baseRotate = isHovered ? -7 : -3

    const yVal = offset * baseOffset
    const rotateVal = offset * baseRotate
    const scaleVal = 1 - offset * 0.045
    const opacityVal = 1 - offset * 0.15

    return (
      <motion.div
        ref={ref}
        layout
        animate={{
          x: isSwiping ? [0, swipeDistance, 0] : 0,
          y: yVal,
          scale: scaleVal,
          rotate: rotateVal,
          opacity: opacityVal,
          zIndex: isSwiping ? arrayLength : arrayLength - offset,
        }}
        transition={{
          duration: 0.6,
          ease: [0.25, 1, 0.5, 1],
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backfaceVisibility: "hidden" as const,
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
