import * as React from "react"
import { cn } from "@/lib/utils"

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function BentoGrid({ className, children, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-4 md:grid-cols-8 lg:grid-cols-12",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type BentoCardSize = "sm" | "md" | "lg" | "xl" | "full"

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: BentoCardSize
  children: React.ReactNode
  interactive?: boolean
}

const sizeClasses: Record<BentoCardSize, string> = {
  sm: "col-span-4 md:col-span-4 lg:col-span-3",
  md: "col-span-4 md:col-span-4 lg:col-span-6",
  lg: "col-span-4 md:col-span-8 lg:col-span-6 row-span-2",
  xl: "col-span-4 md:col-span-8 lg:col-span-9",
  full: "col-span-4 md:col-span-8 lg:col-span-12",
}

export function BentoCard({
  size = "md",
  className,
  children,
  interactive = false,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "rounded-2xl border border-border bg-card p-6",
        "transition-all duration-200",
        // Size
        sizeClasses[size],
        // Interactive states
        interactive && [
          "cursor-pointer",
          "hover:border-primary/50 hover:shadow-glow-honey/20",
          "active:scale-[0.99]",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Sub-components for consistent card content structure
interface BentoCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function BentoCardHeader({ className, children, ...props }: BentoCardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  )
}

interface BentoCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export function BentoCardTitle({ className, children, ...props }: BentoCardTitleProps) {
  return (
    <h3 className={cn("text-sm font-medium text-muted-foreground", className)} {...props}>
      {children}
    </h3>
  )
}

interface BentoCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function BentoCardContent({ className, children, ...props }: BentoCardContentProps) {
  return (
    <div className={cn("flex-1", className)} {...props}>
      {children}
    </div>
  )
}

interface BentoCardValueProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function BentoCardValue({ className, children, ...props }: BentoCardValueProps) {
  return (
    <div className={cn("text-3xl font-bold text-foreground", className)} {...props}>
      {children}
    </div>
  )
}
