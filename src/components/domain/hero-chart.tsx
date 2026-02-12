'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"
import { HelpModal } from "./help-modal"

interface MonthlyData {
  label: string
  year: number
  month: number
  predictions: number
  honeyIndex: number
}

interface HeroChartProps extends React.HTMLAttributes<HTMLDivElement> {
  currentIndex: number
  totalPredictions: number
  honeyCount: number
  timeline: MonthlyData[]
}

// Animated number hook
function useAnimatedNumber(target: number, duration: number = 1500) {
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

export function HeroChart({ 
  currentIndex, 
  totalPredictions,
  honeyCount,
  timeline,
  className, 
  ...props 
}: HeroChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  // Trigger visibility after mount for animations
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])
  
  // Animated values
  const animatedIndex = useAnimatedNumber(currentIndex, 2000)
  const animatedPredictions = useAnimatedNumber(totalPredictions, 1500)
  const animatedHoney = useAnimatedNumber(honeyCount, 1500)
  
  // 예측이 있는 월만 필터링
  const chartData = timeline.filter(d => d.predictions > 0)
  
  const isValid = currentIndex >= 50

  return (
    <div 
      className={cn(
        "relative rounded-2xl border border-border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-card/80",
        "transition-all duration-700",
        isVisible && "shadow-lg",
        isValid && isVisible && "shadow-bullish/10",
        className
      )} 
      {...props}
    >
      {/* 배경 글로우 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={cn(
            "absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-1000",
            isVisible ? "opacity-20" : "opacity-0",
            isValid ? "bg-bullish" : "bg-primary"
          )} 
        />
        <div 
          className={cn(
            "absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 delay-300",
            isVisible ? "opacity-10" : "opacity-0",
            isValid ? "bg-primary" : "bg-muted"
          )} 
        />
        
      </div>

      <div className="relative z-10 p-6 sm:p-8">
        {/* 상단: 꿀지수 크게 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className={cn(
            "transition-all duration-700 transform",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-3xl sm:text-4xl transition-transform duration-500",
                isVisible && "animate-bounce-subtle"
              )}>🍯</span>
              <span className="text-sm sm:text-base text-muted-foreground font-medium">
                전반꿀 지수
              </span>
              <HelpModal />
            </div>
            <div className="flex items-baseline gap-3">
              <span 
                className={cn(
                  "text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight tabular-nums",
                  "transition-all duration-500",
                  isValid ? "text-bullish" : "text-foreground"
                )}
              >
                {animatedIndex.toFixed(1)}
              </span>
              <span className="text-2xl sm:text-3xl text-muted-foreground">%</span>
            </div>
            
            {/* Validation badge */}
            {isValid && (
              <div className={cn(
                "mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
                "bg-bullish/10 border border-bullish/30 text-bullish text-sm font-medium",
                "animate-scale-in"
              )}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bullish opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-bullish"></span>
                </span>
                역지표 유효!
              </div>
            )}
          </div>
          
          <div className={cn(
            "flex flex-col sm:items-end gap-2 text-sm",
            "transition-all duration-700 delay-200 transform",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-3 h-3 rounded-full bg-bullish transition-transform duration-300 group-hover:scale-125" />
              <span className="text-muted-foreground">
                역지표 적중 <span className="text-foreground font-semibold tabular-nums">{Math.round(animatedHoney)}</span>회
              </span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <span className="w-3 h-3 rounded-full bg-muted-foreground transition-transform duration-300 group-hover:scale-125" />
              <span className="text-muted-foreground">
                총 예측 <span className="text-foreground font-semibold tabular-nums">{Math.round(animatedPredictions)}</span>회
              </span>
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className={cn(
          "h-[250px] sm:h-[300px] lg:h-[350px] -mx-2",
          "transition-all duration-1000 delay-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="honeyGradientHero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--bullish))" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(var(--bullish))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--bullish))" stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              
              <XAxis 
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={10}
                interval="preserveStartEnd"
              />
              
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dx={-5}
                tickFormatter={(value) => `${value}%`}
                ticks={[0, 25, 50, 75, 100]}
              />
              
              {/* 50% 기준선 */}
              <ReferenceLine 
                y={50} 
                stroke="hsl(var(--primary))"
                strokeDasharray="8 4"
                strokeOpacity={0.6}
                label={{
                  value: "역지표 기준",
                  position: "right",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              
              {/* 영역 차트 */}
              <Area
                type="monotone"
                dataKey="honeyIndex"
                stroke="transparent"
                fill="url(#honeyGradientHero)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
              
              {/* 라인 차트 */}
              <Line
                type="monotone"
                dataKey="honeyIndex"
                stroke="hsl(var(--bullish))"
                strokeWidth={3}
                dot={{
                  fill: 'hsl(var(--background))',
                  stroke: 'hsl(var(--bullish))',
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  fill: 'hsl(var(--bullish))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 3,
                  r: 8,
                  filter: 'url(#glow)',
                }}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyData
                    const isAbove = data.honeyIndex >= 50
                    return (
                      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-4 shadow-xl animate-scale-in">
                        <p className="font-semibold text-foreground mb-2">
                          {data.year}년 {data.month}월
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-sm">꿀지수</span>
                            <span className={cn(
                              "font-bold text-lg",
                              isAbove ? "text-bullish" : "text-foreground"
                            )}>
                              {data.honeyIndex.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-sm">예측 수</span>
                            <span className="text-foreground font-medium">{data.predictions}개</span>
                          </div>
                          {isAbove && (
                            <div className="pt-1 mt-1 border-t border-border">
                              <span className="text-xs text-bullish font-medium">🍯 역지표 유효!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 하단 설명 */}
        <div className={cn(
          "mt-4 pt-4 border-t border-border/50",
          "transition-all duration-700 delay-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 group cursor-default">
                <div className="w-8 h-0.5 bg-bullish rounded transition-all duration-300 group-hover:w-12" />
                <span>월별 꿀지수</span>
              </div>
              <div className="flex items-center gap-1.5 group cursor-default">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-primary transition-all duration-300 group-hover:w-8" />
                <span>50% 기준</span>
              </div>
            </div>
            <p className="text-muted-foreground/80">
              50% 이상 = 전인구 예측의 <span className="text-foreground font-medium">반대</span>로 움직임
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
