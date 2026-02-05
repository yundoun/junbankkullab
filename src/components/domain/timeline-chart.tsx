'use client'

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"

interface TimelineData {
  label: string
  year: number
  month: number
  predictions: number
  honeyIndex: number
}

interface TimelineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TimelineData[]
}

export function TimelineChart({ data, className, ...props }: TimelineChartProps) {
  // predictions가 0인 월은 제외 (데이터 없음)
  const filteredData = data.filter(d => d.predictions > 0)
  
  if (filteredData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-[300px] text-muted-foreground", className)}>
        타임라인 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={filteredData}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="honeyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-honey))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--chart-honey))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="hsl(var(--border))"
          />
          
          <XAxis 
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dy={10}
          />
          
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dx={-10}
            tickFormatter={(value) => `${value}%`}
          />
          
          {/* 50% 기준선 */}
          <ReferenceLine 
            y={50} 
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
          
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TimelineData
                return (
                  <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                    <p className="font-medium text-foreground">
                      {data.year}년 {data.month}월
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        꿀지수: <span className={cn(
                          "font-semibold",
                          data.honeyIndex >= 50 ? "text-bullish" : "text-foreground"
                        )}>{data.honeyIndex}%</span>
                      </p>
                      <p className="text-muted-foreground">
                        예측 수: <span className="text-foreground">{data.predictions}개</span>
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          
          <Area
            type="monotone"
            dataKey="honeyIndex"
            stroke="hsl(var(--chart-honey))"
            strokeWidth={2}
            fill="url(#honeyGradient)"
            dot={{
              fill: 'hsl(var(--background))',
              stroke: 'hsl(var(--chart-honey))',
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              fill: 'hsl(var(--chart-honey))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
              r: 6,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
