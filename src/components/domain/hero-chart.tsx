'use client'

import * as React from "react"
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
  Scatter,
} from "recharts"
import { cn } from "@/lib/utils"

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

export function HeroChart({ 
  currentIndex, 
  totalPredictions,
  honeyCount,
  timeline,
  className, 
  ...props 
}: HeroChartProps) {
  // 예측이 있는 월만 필터링
  const chartData = timeline.filter(d => d.predictions > 0)
  
  const isValid = currentIndex >= 50

  return (
    <div 
      className={cn(
        "relative rounded-2xl border border-border bg-gradient-to-br from-card via-card to-card/80 overflow-hidden",
        className
      )} 
      {...props}
    >
      {/* 배경 글로우 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={cn(
            "absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20",
            isValid ? "bg-bullish" : "bg-primary"
          )} 
        />
        <div 
          className={cn(
            "absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10",
            isValid ? "bg-primary" : "bg-muted"
          )} 
        />
      </div>

      <div className="relative z-10 p-6 sm:p-8">
        {/* 상단: 꿀지수 크게 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl sm:text-4xl">🍯</span>
              <span className="text-sm sm:text-base text-muted-foreground font-medium">
                전반꿀 지수
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span 
                className={cn(
                  "text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight",
                  isValid ? "text-bullish" : "text-foreground"
                )}
              >
                {currentIndex.toFixed(1)}
              </span>
              <span className="text-2xl sm:text-3xl text-muted-foreground">%</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:items-end gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-bullish" />
              <span className="text-muted-foreground">
                역지표 적중 <span className="text-foreground font-semibold">{honeyCount}</span>회
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">
                총 예측 <span className="text-foreground font-semibold">{totalPredictions}</span>회
              </span>
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className="h-[250px] sm:h-[300px] lg:h-[350px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="honeyGradientHero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--bullish))" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="hsl(var(--bullish))" stopOpacity={0.1} />
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
              />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyData
                    const isAbove = data.honeyIndex >= 50
                    return (
                      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-4 shadow-xl">
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
                              <span className="text-xs text-bullish">🍯 역지표 유효!</span>
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
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-0.5 bg-bullish rounded" />
                <span>월별 꿀지수</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-primary" />
                <span>50% 기준</span>
              </div>
            </div>
            <p className="text-muted-foreground/80">
              50% 이상 = 전인구 예측의 <span className="text-foreground">반대</span>로 움직임
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
