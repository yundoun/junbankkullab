'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FunnelData {
  totalVideos: number
  withMentions: number
  withTone: number
  withMarketData: number
  honeyHits: number
}

interface AnalysisFunnelProps extends React.HTMLAttributes<HTMLDivElement> {
  funnel: FunnelData
  unanalyzedCount: number
  excludedCount: number
}

// Animated number hook
function useAnimatedNumber(target: number, duration: number = 1000) {
  const [current, setCurrent] = useState(0)
  
  useEffect(() => {
    const startTime = Date.now()
    const startValue = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = startValue + (target - startValue) * eased
      
      setCurrent(value)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [target, duration])
  
  return current
}

// Funnel row component
function FunnelRow({ 
  label, 
  value, 
  indent = 0,
  emoji,
  highlight = false,
  percentage,
  delay = 0 
}: { 
  label: string
  value: number
  indent?: number
  emoji?: string
  highlight?: boolean
  percentage?: number
  delay?: number
}) {
  const animatedValue = useAnimatedNumber(value, 1200)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])
  
  // Calculate width percentage based on max value (100% for first item)
  const widthPercent = Math.max(10, (value / 588) * 100)
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 sm:gap-3 py-1.5 transition-all duration-500",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      )}
      style={{ paddingLeft: `${indent * 12}px` }}
    >
      {/* Tree connector */}
      {indent > 0 && (
        <div className="flex items-center text-muted-foreground/50 select-none">
          {indent === 1 && <span className="text-xs">├</span>}
          {indent === 2 && <span className="text-xs">│ ├</span>}
          {indent === 3 && <span className="text-xs">│ │ └</span>}
          {indent === 4 && <span className="text-xs">│ │ &nbsp; └</span>}
        </div>
      )}
      
      {/* Emoji */}
      {emoji && (
        <span className={cn(
          "text-base transition-transform duration-300",
          highlight && "animate-bounce-subtle"
        )}>
          {emoji}
        </span>
      )}
      
      {/* Label */}
      <span className={cn(
        "text-xs sm:text-sm flex-shrink-0",
        highlight ? "text-bullish font-semibold" : "text-muted-foreground"
      )}>
        {label}
      </span>
      
      {/* Progress bar area */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              highlight 
                ? "bg-gradient-to-r from-bullish to-bullish/80" 
                : indent === 0 
                  ? "bg-primary/60"
                  : "bg-muted-foreground/40"
            )}
            style={{ 
              width: isVisible ? `${widthPercent}%` : '0%',
              transitionDelay: `${delay + 200}ms`
            }}
          />
        </div>
        
        {/* Value */}
        <span className={cn(
          "text-sm sm:text-base font-bold tabular-nums min-w-[3rem] text-right",
          highlight ? "text-bullish" : "text-foreground"
        )}>
          {Math.round(animatedValue)}
        </span>
        
        {/* Percentage badge */}
        {percentage !== undefined && (
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-block",
            highlight 
              ? "bg-bullish/20 text-bullish" 
              : "bg-muted text-muted-foreground"
          )}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

export function AnalysisFunnel({ 
  funnel,
  unanalyzedCount,
  excludedCount,
  className, 
  ...props 
}: AnalysisFunnelProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Calculate percentages
  const hitRate = funnel.withMarketData > 0 
    ? (funnel.honeyHits / funnel.withMarketData) * 100 
    : 0

  return (
    <div 
      className={cn(
        "rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 sm:p-6",
        "transition-all duration-500",
        isVisible && "shadow-lg",
        className
      )} 
      {...props}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 mb-4 pb-3 border-b border-border/50",
        "transition-all duration-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}>
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">데이터 분석 현황</h3>
      </div>

      {/* Funnel visualization */}
      <div className="space-y-0.5">
        <FunnelRow 
          label="전체 영상" 
          value={funnel.totalVideos}
          delay={100}
        />
        <FunnelRow 
          label="종목 언급" 
          value={funnel.withMentions}
          indent={1}
          delay={200}
        />
        <FunnelRow 
          label="톤 분석 완료" 
          value={funnel.withTone}
          indent={2}
          delay={300}
        />
        <FunnelRow 
          label="시장 확인" 
          value={funnel.withMarketData}
          indent={3}
          delay={400}
        />
        <FunnelRow 
          emoji="🍯"
          label="적중" 
          value={funnel.honeyHits}
          indent={4}
          highlight={true}
          percentage={hitRate}
          delay={500}
        />
        
        {/* Divider */}
        <div className="my-2 border-t border-dashed border-border/50" />
        
        {/* Secondary stats */}
        <FunnelRow 
          label="톤 미확정" 
          value={unanalyzedCount}
          indent={2}
          delay={600}
        />
        <FunnelRow 
          label="제외 (알트)" 
          value={excludedCount}
          indent={1}
          delay={700}
        />
      </div>

      {/* Footer explanation */}
      <div className={cn(
        "mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground",
        "transition-all duration-700 delay-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}>
        <p className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-bullish animate-pulse" />
          적중률 {hitRate.toFixed(1)}%: 시장 확인된 예측 중 역지표가 맞은 비율
        </p>
      </div>
    </div>
  )
}
