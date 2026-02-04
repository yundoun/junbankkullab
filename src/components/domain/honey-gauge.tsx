'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface HoneyGaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  label?: string
  showValue?: boolean
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

export function HoneyGauge({
  value,
  label = "전반꿀 지수",
  showValue = true,
  size = "md",
  animated = true,
  className,
  ...props
}: HoneyGaugeProps) {
  const [displayValue, setDisplayValue] = React.useState(animated ? 0 : value)
  
  // Animate value on mount/change
  React.useEffect(() => {
    if (!animated) {
      setDisplayValue(value)
      return
    }
    
    const duration = 1000 // ms
    const steps = 60
    const stepDuration = duration / steps
    const increment = (value - displayValue) / steps
    
    let current = displayValue
    let step = 0
    
    const timer = setInterval(() => {
      step++
      current += increment
      setDisplayValue(Math.round(current * 10) / 10)
      
      if (step >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      }
    }, stepDuration)
    
    return () => clearInterval(timer)
  }, [value, animated])
  
  // Color based on value
  const getColor = () => {
    if (displayValue >= 60) return "bullish"
    if (displayValue <= 40) return "bearish"
    return "pending"
  }
  
  const color = getColor()
  
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }
  
  const valueSizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  }
  
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {showValue && (
          <span className={cn(
            "text-sm font-semibold",
            color === "bullish" && "text-bullish",
            color === "bearish" && "text-bearish",
            color === "pending" && "text-honey",
          )}>
            {displayValue >= 50 ? "+" : ""}{(displayValue - 50).toFixed(1)}%
          </span>
        )}
      </div>
      
      {/* Main value */}
      {showValue && (
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-bold tabular-nums",
            valueSizeClasses[size],
            color === "bullish" && "text-bullish",
            color === "bearish" && "text-bearish",
            color === "pending" && "text-honey",
          )}>
            {displayValue.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">%</span>
        </div>
      )}
      
      {/* Gauge bar */}
      <div className={cn(
        "relative w-full rounded-full bg-muted overflow-hidden",
        sizeClasses[size]
      )}>
        {/* Background gradient markers */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-bearish/20" />
          <div className="flex-1 bg-pending/20" />
          <div className="flex-1 bg-bullish/20" />
        </div>
        
        {/* Fill */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
            color === "bullish" && "bg-bullish shadow-glow-bullish",
            color === "bearish" && "bg-bearish shadow-glow-bearish",
            color === "pending" && "bg-honey shadow-glow-honey",
          )}
          style={{ width: `${displayValue}%` }}
        />
        
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-foreground/30" />
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
