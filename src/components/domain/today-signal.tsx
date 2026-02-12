'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Bell, TrendingUp, TrendingDown, ArrowRight, ExternalLink } from "lucide-react"

interface Prediction {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  priceChange?: number
  status?: 'correct' | 'incorrect' | 'pending'
}

interface TodaySignalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 최신 예측들 (최대 3개 표시) */
  predictions: Prediction[]
}

// 상대 시간 계산
function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return '방금 전'
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function TodaySignal({
  predictions,
  className,
  ...props
}: TodaySignalProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // 최신 예측 1개만 메인으로 표시
  const latestPrediction = predictions[0]

  if (!latestPrediction) {
    return null
  }

  const isBearish = latestPrediction.predictedDirection === 'bearish'
  const oppositeDirection = isBearish ? '상승' : '하락'
  const oppositeEmoji = isBearish ? '📈' : '📉'

  return (
    <div 
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        "bg-gradient-to-br from-amber-500/5 via-card to-amber-500/10",
        "transition-all duration-500",
        isVisible && "shadow-xl",
        className
      )} 
      {...props}
    >
      {/* 배경 글로우 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={cn(
            "absolute -top-1/2 -right-1/4 w-[300px] h-[300px] rounded-full blur-3xl transition-opacity duration-1000",
            isVisible ? "opacity-20" : "opacity-0",
            "bg-amber-400"
          )} 
        />
      </div>

      <div className="relative z-10 p-5 sm:p-6">
        {/* 헤더 */}
        <div className={cn(
          "flex items-center justify-between mb-4",
          "transition-all duration-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              오늘의 시그널
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(latestPrediction.publishedAt)}
          </span>
        </div>

        {/* 메인 시그널 */}
        <div className={cn(
          "transition-all duration-700 delay-100",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {/* 전인구 예측 */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">전인구 소장의 예측</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                "{latestPrediction.asset}"
              </span>
              <div className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium",
                isBearish 
                  ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                  : "bg-green-500/10 text-green-600 dark:text-green-400"
              )}>
                {isBearish ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {isBearish ? '하락' : '상승'} 전망
              </div>
            </div>
          </div>

          {/* 화살표 구분선 */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-xs">전반꿀 시그널</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 반대 시그널 (전반꿀) */}
          <div className={cn(
            "rounded-xl p-4",
            "bg-gradient-to-r from-amber-500/10 to-amber-500/5",
            "border border-amber-500/20"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">역지표 기반 예측</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{oppositeEmoji}</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {latestPrediction.asset} {oppositeDirection}
                  </span>
                </div>
              </div>
              <span className="text-3xl">🍯</span>
            </div>
          </div>

          {/* 영상 링크 */}
          <a 
            href={`https://youtube.com/watch?v=${latestPrediction.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mt-4 text-xs text-muted-foreground",
              "hover:text-foreground transition-colors"
            )}
          >
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{latestPrediction.title}</span>
          </a>
        </div>

        {/* 추가 시그널 미리보기 (있을 경우) */}
        {predictions.length > 1 && (
          <div className={cn(
            "mt-4 pt-4 border-t border-border/50",
            "transition-all duration-700 delay-200",
            isVisible ? "opacity-100" : "opacity-0"
          )}>
            <p className="text-xs text-muted-foreground mb-2">최근 시그널</p>
            <div className="flex flex-wrap gap-2">
              {predictions.slice(1, 4).map((pred, idx) => (
                <div 
                  key={`${pred.videoId}-${pred.asset}-${idx}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
                    "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>{pred.predictedDirection === 'bearish' ? '📈' : '📉'}</span>
                  <span>{pred.asset}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
