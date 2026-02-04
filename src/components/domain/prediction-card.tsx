'use client'

import * as React from "react"
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type PredictionStatus = "pending" | "correct" | "incorrect"
type PredictionDirection = "bullish" | "bearish" | "neutral"

interface PredictionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  thumbnail?: string
  publishedAt: string
  asset?: string
  predictedDirection: PredictionDirection
  actualDirection?: PredictionDirection
  status: PredictionStatus
  priceChange?: number // percentage
  videoUrl?: string
}

export function PredictionCard({
  title,
  thumbnail,
  publishedAt,
  asset,
  predictedDirection,
  actualDirection,
  status,
  priceChange,
  videoUrl,
  className,
  ...props
}: PredictionCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "대기중",
      variant: "pending" as const,
      bgClass: "bg-pending/5",
    },
    correct: {
      icon: CheckCircle,
      label: "적중",
      variant: "bullish" as const,
      bgClass: "bg-bullish/5",
    },
    incorrect: {
      icon: XCircle,
      label: "빗나감",
      variant: "bearish" as const,
      bgClass: "bg-bearish/5",
    },
  }
  
  const directionConfig = {
    bullish: {
      icon: TrendingUp,
      label: "상승",
      color: "text-bullish",
    },
    bearish: {
      icon: TrendingDown,
      label: "하락",
      color: "text-bearish",
    },
    neutral: {
      icon: null,
      label: "중립",
      color: "text-muted-foreground",
    },
  }
  
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const PredictionIcon = directionConfig[predictedDirection].icon
  
  return (
    <div
      className={cn(
        "group flex gap-4 rounded-xl border border-border p-4",
        "transition-all duration-200",
        "hover:border-primary/30 hover:bg-card",
        config.bgClass,
        className
      )}
      {...props}
    >
      {/* Thumbnail */}
      {thumbnail && (
        <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {asset && (
                <>
                  <span className="font-medium text-foreground">{asset}</span>
                  <span>•</span>
                </>
              )}
              <span>{new Date(publishedAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          
          {/* Status badge */}
          <Badge variant={config.variant} className="flex-shrink-0 gap-1">
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
        
        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          {/* Prediction */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">예측:</span>
            <span className={cn("flex items-center gap-1 font-medium", directionConfig[predictedDirection].color)}>
              {PredictionIcon && <PredictionIcon className="w-4 h-4" />}
              {directionConfig[predictedDirection].label}
            </span>
            
            {/* Actual result */}
            {actualDirection && status !== "pending" && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className={cn("flex items-center gap-1 font-medium", directionConfig[actualDirection].color)}>
                  {directionConfig[actualDirection].icon && 
                    React.createElement(directionConfig[actualDirection].icon, { className: "w-4 h-4" })
                  }
                  {directionConfig[actualDirection].label}
                </span>
              </>
            )}
          </div>
          
          {/* Price change */}
          {priceChange !== undefined && status !== "pending" && (
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              priceChange >= 0 ? "text-bullish" : "text-bearish"
            )}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
