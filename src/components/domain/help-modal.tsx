'use client'

import * as React from 'react'
import { TrendingDown, TrendingUp, Sparkles, BarChart2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface HelpModalProps {
  className?: string
  /** 버튼 텍스트 (기본: "어떻게 계산되나요?") */
  label?: string
}

export function HelpModal({ className, label = "어떻게 계산되나요?" }: HelpModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "text-xs text-muted-foreground hover:text-primary",
            "underline-offset-2 hover:underline",
            "transition-colors duration-200",
            "focus:outline-none focus:text-primary",
            className
          )}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🍯</span>
            전반꿀 연구소란?
          </DialogTitle>
          <DialogDescription className="text-base">
            전인구경제연구소 예측을 역지표로 검증하는 실험입니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* 역지표란? */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-amber-500" />
              </div>
              역지표란?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed pl-10">
              특정 예측자의 의견과 <strong className="text-foreground">반대로</strong> 행동했을 때 
              더 좋은 결과가 나오는 현상입니다. 전인구 소장이 "상승"을 예측하면 실제로는 
              하락하는 패턴이 자주 관측되어 이를 검증합니다.
            </p>
          </section>

          {/* 전반꿀 vs 전인구 */}
          <section className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              용어 설명
            </h3>
            <div className="space-y-3 pl-10">
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🍯</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">전반꿀</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>전</strong>인구의 <strong>반</strong>대가 <strong>꿀</strong>이다! 
                  전인구 예측의 반대로 시장이 움직인 경우입니다.
                </p>
              </div>
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📈</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">전인구</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  전인구 소장의 예측대로 시장이 움직인 경우입니다.
                  역지표 가설과 반대되는 결과죠.
                </p>
              </div>
            </div>
          </section>

          {/* 꿀지수 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-bullish/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-bullish" />
              </div>
              꿀지수란?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed pl-10">
              전체 예측 중 <strong className="text-amber-500">전반꿀</strong>(역지표 적중)의 비율입니다.
            </p>
            <div className="pl-10 space-y-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <code className="text-sm font-mono">
                  꿀지수 = (전반꿀 횟수 ÷ 전체 예측) × 100%
                </code>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bullish" />
                  <span><strong className="text-bullish">50% 이상</strong>: 역지표 가설 유효</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span><strong>50% 미만</strong>: 역지표 가설 약함</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 분석 방법 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-foreground" />
              </div>
              분석 방법
            </h3>
            <ol className="text-sm text-muted-foreground space-y-2 pl-10 list-decimal list-inside">
              <li>전인구경제연구소 유튜브 영상에서 종목 예측 추출</li>
              <li>LLM(GPT-4o-mini)으로 상승/하락 톤 분석</li>
              <li>영상 공개 익일 실제 시장 데이터와 비교</li>
              <li>예측과 반대로 움직이면 "전반꿀" 기록</li>
            </ol>
          </section>

          {/* 주의사항 */}
          <section className="rounded-lg bg-muted/30 border border-border p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ⚠️ <strong>주의:</strong> 본 사이트는 엔터테인먼트 목적으로 제작되었습니다. 
              투자 조언이 아니며, 모든 투자 결정은 본인 책임입니다. 
              과거 데이터가 미래 성과를 보장하지 않습니다.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
