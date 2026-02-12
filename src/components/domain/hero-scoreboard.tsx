'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp, Zap } from "lucide-react"

// 기간별 데이터 타입
interface PeriodData {
  value: number      // 꿀지수 %
  total: number      // 전체 분석 수
  honey: number      // 전반꿀 적중 수
}

type PeriodKey = '1d' | '1w' | '1m' | '3m'

interface HeroScoreboardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 전반꿀 적중 수 (전인구가 틀린 횟수) - 하위호환 */
  honeyCount: number
  /** 전인구 적중 수 (전인구가 맞춘 횟수) - 하위호환 */
  correctCount: number
  /** 전체 분석 수 - 하위호환 */
  totalPredictions: number
  /** 꿀지수 (%) - 하위호환 */
  honeyIndex: number
  /** 기간별 꿀지수 (신규) */
  honeyIndexByPeriod?: {
    '1d': PeriodData
    '1w': PeriodData
    '1m': PeriodData
    '3m': PeriodData
  }
  /** 기본 선택 기간 */
  defaultPeriod?: PeriodKey
}

// 기간 라벨
const PERIOD_LABELS: Record<PeriodKey, string> = {
  '1d': '1일',
  '1w': '1주',
  '1m': '1개월',
  '3m': '3개월',
}

// 숫자 애니메이션 훅
function useAnimatedNumber(target: number, duration: number = 1500) {
  const [current, setCurrent] = useState(0)
  
  useEffect(() => {
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(target * eased))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [target, duration])
  
  return current
}

export function HeroScoreboard({
  honeyCount,
  correctCount,
  totalPredictions,
  honeyIndex,
  honeyIndexByPeriod,
  defaultPeriod = '1m',
  className,
  ...props
}: HeroScoreboardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(defaultPeriod)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // 기간별 데이터 가져오기 (없으면 기존 값 사용)
  const currentData = honeyIndexByPeriod?.[selectedPeriod] ?? {
    value: honeyIndex,
    total: totalPredictions,
    honey: honeyCount,
  }

  const currentHoneyCount = currentData.honey
  const currentTotal = currentData.total
  const currentCorrectCount = currentTotal - currentHoneyCount
  const currentHoneyIndex = currentData.value
  
  const animatedHoney = useAnimatedNumber(currentHoneyCount, 1500)
  const animatedCorrect = useAnimatedNumber(currentCorrectCount, 1500)
  const animatedIndex = useAnimatedNumber(Math.round(currentHoneyIndex * 10), 2000) / 10

  // 전반꿀이 이기고 있는지
  const honeyWinning = currentHoneyCount > currentCorrectCount

  // 기간 탭 사용 여부
  const usePeriodTabs = !!honeyIndexByPeriod

  return (
    <div 
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-card/80",
        "transition-all duration-700",
        isVisible && "shadow-2xl",
        className
      )} 
      {...props}
    >
      {/* 배경 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 왼쪽: 꿀 색상 */}
        <div 
          className={cn(
            "absolute -top-1/2 -left-1/4 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-1000",
            isVisible ? "opacity-30" : "opacity-0",
            "bg-amber-500"
          )} 
        />
        {/* 오른쪽: 파란 색상 */}
        <div 
          className={cn(
            "absolute -bottom-1/2 -right-1/4 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-1000 delay-200",
            isVisible ? "opacity-20" : "opacity-0",
            "bg-blue-500"
          )} 
        />
      </div>

      <div className="relative z-10">
        {/* 상단 타이틀 */}
        <div className={cn(
          "text-center pt-6 pb-4 border-b border-border/50",
          "transition-all duration-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
              역지표 검증 리포트
            </span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            전인구경제연구소 vs 실제 시장
          </h1>
        </div>

        {/* 기간 선택 탭 */}
        {usePeriodTabs && (
          <div className={cn(
            "flex justify-center gap-2 px-6 py-4",
            "transition-all duration-500 delay-100",
            isVisible ? "opacity-100" : "opacity-0"
          )}>
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((period) => {
              const periodData = honeyIndexByPeriod[period]
              const isSelected = selectedPeriod === period
              const hasData = periodData && periodData.total > 0
              
              return (
                <button
                  key={period}
                  onClick={() => hasData && setSelectedPeriod(period)}
                  disabled={!hasData}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isSelected
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : hasData
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed",
                    isSelected && "scale-105"
                  )}
                >
                  {PERIOD_LABELS[period]}
                  {!hasData && (
                    <span className="ml-1 text-xs opacity-70">준비중</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 스코어보드 메인 */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* 왼쪽: 전반꿀 (전인구 틀림) */}
            <div className={cn(
              "text-center transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}>
              <div className="mb-2">
                <span className="text-4xl sm:text-5xl">🍯</span>
              </div>
              <div className={cn(
                "text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums",
                "text-amber-500",
                honeyWinning && "scale-110"
              )}>
                {animatedHoney}
              </div>
              <div className="mt-2 text-sm text-muted-foreground font-medium">
                전반꿀
              </div>
              <div className="text-xs text-muted-foreground/70">
                (역지표 적중)
              </div>
            </div>

            {/* 중앙: VS + 지수 */}
            <div className={cn(
              "text-center transition-all duration-700 delay-200",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
              <div className="relative">
                {/* VS 배지 */}
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted border-2 border-border shadow-lg">
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    VS
                  </span>
                </div>
                
                {/* 꿀지수 표시 */}
                <div className="mt-4">
                  <div className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                    "bg-amber-500/10 border border-amber-500/30",
                    "transition-all duration-300"
                  )}>
                    <span className="text-2xl sm:text-3xl font-bold text-amber-500 tabular-nums">
                      {animatedIndex.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    전반꿀 지수 {usePeriodTabs && `(${PERIOD_LABELS[selectedPeriod]})`}
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 전인구 맞춤 */}
            <div className={cn(
              "text-center transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}>
              <div className="mb-2">
                <span className="text-4xl sm:text-5xl">📈</span>
              </div>
              <div className={cn(
                "text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums",
                "text-blue-500",
                !honeyWinning && "scale-110"
              )}>
                {animatedCorrect}
              </div>
              <div className="mt-2 text-sm text-muted-foreground font-medium">
                전인구
              </div>
              <div className="text-xs text-muted-foreground/70">
                (예측 적중)
              </div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className={cn(
            "mt-8 transition-all duration-700 delay-400",
            isVisible ? "opacity-100" : "opacity-0"
          )}>
            <div className="relative h-4 rounded-full bg-muted overflow-hidden">
              {/* 전반꿀 비율 */}
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000 ease-out"
                style={{ width: `${isVisible ? currentHoneyIndex : 0}%` }}
              />
              {/* 전인구 비율 */}
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-400 to-blue-500 transition-all duration-1000 ease-out"
                style={{ width: `${isVisible ? (100 - currentHoneyIndex) : 0}%` }}
              />
              {/* 50% 마커 */}
              <div className="absolute left-1/2 top-0 w-0.5 h-full bg-background/50 -translate-x-1/2" />
            </div>
            
            {/* 레이블 */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>🍯 {currentHoneyIndex.toFixed(1)}%</span>
              <span className="text-muted-foreground/50">|</span>
              <span>📈 {(100 - currentHoneyIndex).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 하단 인사이트 */}
        <div className={cn(
          "px-6 pb-6 sm:px-8 sm:pb-8",
          "transition-all duration-700 delay-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <div className={cn(
            "rounded-xl p-4",
            "bg-gradient-to-r",
            honeyWinning 
              ? "from-amber-500/10 to-amber-500/5 border border-amber-500/20" 
              : "from-blue-500/10 to-blue-500/5 border border-blue-500/20"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                honeyWinning ? "bg-amber-500/20" : "bg-blue-500/20"
              )}>
                {honeyWinning ? (
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div>
                <p className={cn(
                  "font-semibold",
                  honeyWinning ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                )}>
                  {honeyWinning ? (
                    <>{PERIOD_LABELS[selectedPeriod]} 기준, 전인구 소장이 {currentTotal}번 중 {currentHoneyCount}번 틀렸습니다</>
                  ) : (
                    <>{PERIOD_LABELS[selectedPeriod]} 기준, 전인구 소장이 {currentTotal}번 중 {currentCorrectCount}번 맞췄습니다</>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {honeyWinning ? (
                    <>역지표 가설이 유효합니다. 전인구 예측의 <strong>반대</strong>가 더 자주 맞았습니다.</>
                  ) : (
                    <>현재 데이터로는 역지표 가설이 약합니다. 추가 데이터 수집이 필요합니다.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 분석 기간 표시 */}
        <div className={cn(
          "border-t border-border/50 px-6 py-3 sm:px-8",
          "flex items-center justify-between text-xs text-muted-foreground",
          "transition-all duration-700 delay-600",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          <span>📊 분석 대상: {currentTotal}개 예측</span>
          <span>2025.01 ~ 현재</span>
        </div>
      </div>
    </div>
  )
}
