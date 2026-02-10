'use client'

import * as React from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, ExternalLink, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type PredictionStatus = "pending" | "correct" | "incorrect"
type PredictionDirection = "bullish" | "bearish" | "neutral"

interface PredictionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  thumbnail?: string
  videoId?: string
  publishedAt: string
  asset?: string
  predictedDirection: PredictionDirection
  actualDirection?: PredictionDirection
  status: PredictionStatus
  priceChange?: number // percentage
  videoUrl?: string
  index?: number // for stagger animation
  tradingDate?: string // e.g. "2026-02-10"
  dataSource?: string // default: "Yahoo Finance"
}

export function PredictionCard({
  title,
  thumbnail,
  videoId,
  publishedAt,
  asset,
  predictedDirection,
  actualDirection,
  status,
  priceChange,
  videoUrl,
  index = 0,
  tradingDate,
  dataSource = "Yahoo Finance",
  className,
  ...props
}: PredictionCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "대기중",
      variant: "pending" as const,
      bgClass: "bg-pending/5",
      borderClass: "border-pending/20",
    },
    correct: {
      icon: CheckCircle,
      label: "적중",
      variant: "bullish" as const,
      bgClass: "bg-bullish/5",
      borderClass: "border-bullish/20",
    },
    incorrect: {
      icon: XCircle,
      label: "빗나감",
      variant: "bearish" as const,
      bgClass: "bg-bearish/5",
      borderClass: "border-bearish/20",
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
  
  // Generate thumbnail URL if not provided
  const thumbnailUrl = thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)
  const youtubeUrl = videoUrl || (videoId ? `https://youtube.com/watch?v=${videoId}` : null)
  
  // Stagger delay calculation (max 800ms)
  const staggerDelay = Math.min(index * 50, 800)
  
  // 상세 페이지 URL
  const detailUrl = videoId ? `/video/${videoId}` : undefined

  return (
    <Link
      href={detailUrl || '#'}
      className={cn(
        "group relative flex gap-4 rounded-xl border p-4",
        "bg-card/50 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:bg-card hover:border-primary/30",
        "hover:shadow-lg hover:shadow-primary/5",
        "hover:-translate-y-1",
        "animate-fade-up fill-backwards",
        "cursor-pointer",
        config.bgClass,
        config.borderClass,
        className
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="thumbnail-container relative w-32 sm:w-40 h-20 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300">
              {title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span>{new Date(publishedAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</span>
              {asset && (
                <>
                  <span>•</span>
                  <span className="font-medium text-foreground">
                    {asset}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* 꿀 뱃지 (역지표 적중 시에만) */}
          {status === 'correct' && (
            <span className="flex-shrink-0 text-2xl animate-bounce-subtle">
              🍯
            </span>
          )}
        </div>
        
        {/* Bottom row - Prediction Flow */}
        <div className="flex items-center justify-between mt-3">
          {/* Prediction → Result 흐름 */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {/* 예측 */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium",
              "bg-muted/50"
            )}>
              <span className="text-muted-foreground text-xs">🔮</span>
              <span className={directionConfig[predictedDirection].color}>
                {directionConfig[predictedDirection].label}
              </span>
            </span>
            
            {/* 화살표 + 결과 */}
            {status !== "pending" && (
              <>
                <span className="text-muted-foreground">→</span>
                
                {/* 결과 + 가격변동률 통합 */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-semibold",
                  status === 'correct' 
                    ? "bg-bullish/10 text-bullish" 
                    : "bg-bearish/10 text-bearish"
                )}>
                  {status === 'correct' ? '✅' : '❌'}
                  {actualDirection && (
                    <span className="flex items-center gap-0.5">
                      {directionConfig[actualDirection].icon && 
                        React.createElement(directionConfig[actualDirection].icon, { className: "w-3.5 h-3.5" })
                      }
                    </span>
                  )}
                  {/* 가격 변동률 - 핵심! */}
                  {priceChange !== undefined && (
                    <span className="tabular-nums font-bold">
                      {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%
                    </span>
                  )}
                </span>
              </>
            )}
            
            {status === "pending" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pending/10 text-pending font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>대기중</span>
              </span>
            )}
          </div>
          
          {/* 출처 정보 - 결과가 있을 때만 표시 */}
          {status !== "pending" && tradingDate && (
            <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
              {new Date(tradingDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 종가 · {dataSource}
            </span>
          )}
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "absolute inset-0 rounded-xl",
          status === 'correct' && "shadow-[inset_0_0_20px_rgba(14,203,129,0.1)]",
          status === 'incorrect' && "shadow-[inset_0_0_20px_rgba(246,70,93,0.1)]",
          status === 'pending' && "shadow-[inset_0_0_20px_rgba(252,213,53,0.1)]"
        )} />
      </div>
    </Link>
  )
}
