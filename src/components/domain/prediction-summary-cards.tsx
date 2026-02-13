'use client'

import * as React from 'react'
import { useState } from 'react'
import { TrendingDown, TrendingUp, Clock, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PredictionCard } from './prediction-card'

interface PeriodData {
  '1d': number
  '1w': number
  '1m': number
  '3m': number
}

interface LatestItem {
  asset: string
  priceChange?: number
  daysAgo: number
}

interface NextResult {
  asset: string
  direction: 'bullish' | 'bearish'
  daysLeft: number
  tradingDate?: string
}

interface HoneyStats {
  count: number
  total: number
  percentage: number
  avgPriceChange: number
  maxPriceChange: number
  maxPriceAsset: string | null
  byPeriod: PeriodData
  latest: LatestItem | null
}

interface CorrectStats {
  count: number
  total: number
  percentage: number
  avgPriceChange: number
  maxPriceChange: number
  maxPriceAsset: string | null
  byPeriod: PeriodData
  latest: LatestItem | null
}

interface PendingStats {
  count: number
  nextResults: NextResult[]
}

interface Prediction {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  status: 'correct' | 'incorrect' | 'pending'
  actualDirection?: 'bullish' | 'bearish'
  priceChange?: number
  tradingDate?: string
}

interface PredictionSummaryCardsProps {
  honeyStats: HoneyStats
  correctStats: CorrectStats
  pendingStats: PendingStats
  honeyHits: Prediction[]
  jigHits: Prediction[]
  pendingReviews: Prediction[]
  className?: string
}

const ITEMS_PER_PAGE = 10

// 페이지네이션된 예측 리스트
function PaginatedPredictionList({ items, title, emoji }: { 
  items: Prediction[]
  title: string
  emoji: string
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span>{emoji}</span> {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length}건)
          </span>
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-3 mt-4">
        {paginatedItems.map((item, idx) => (
          <PredictionCard
            key={`${item.videoId}-${item.asset}-${startIdx + idx}`}
            {...item}
            index={idx}
          />
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentPage === 1
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-foreground hover:bg-muted"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                  page === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentPage === totalPages
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-foreground hover:bg-muted"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  )
}

// 기간별 적중률 컴포넌트
function PeriodStats({ byPeriod, type }: { byPeriod: PeriodData; type: 'honey' | 'correct' }) {
  const bestPeriod = Object.entries(byPeriod).reduce((best, [key, value]) => 
    value > best.value ? { key, value } : best
  , { key: '1d', value: 0 })

  return (
    <div className="rounded-lg bg-background/50 p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">📊 기간별 적중률</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(byPeriod).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {key === '1d' ? '1일' : key === '1w' ? '1주' : key === '1m' ? '1개월' : '3개월'}:
            </span>
            <span className={cn(
              'font-medium tabular-nums',
              key === bestPeriod.key && type === 'honey' && 'text-amber-500',
              key === bestPeriod.key && type === 'correct' && 'text-blue-500'
            )}>
              {value.toFixed(1)}%
              {key === bestPeriod.key && ' ⭐'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 역지표 카드
function HoneyCard({ stats, hits }: { stats: HoneyStats; hits: Prediction[] }) {
  return (
    <Dialog>
      <div className={cn(
        'rounded-2xl border p-5 h-full',
        'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
        'border-amber-500/30'
      )}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🍯</span>
          <span className="font-bold text-lg">역지표 적중</span>
        </div>

        {/* 메인 스탯 */}
        <div className="mb-4">
          <div className="text-3xl font-bold tabular-nums text-amber-500">
            {stats.count}<span className="text-lg text-muted-foreground">/{stats.total}건</span>
          </div>
          <div className="mt-2 relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="mt-1 text-right text-sm font-medium text-amber-500">
            {stats.percentage.toFixed(1)}%
          </div>
        </div>

        {/* 기간별 */}
        <PeriodStats byPeriod={stats.byPeriod} type="honey" />

        {/* 추가 통계 */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-bearish" />
            <span className="text-muted-foreground">평균 역변동폭:</span>
            <span className="font-medium text-bearish">{stats.avgPriceChange.toFixed(1)}%</span>
          </div>
          {stats.maxPriceAsset && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">최대:</span>
              <span className="font-medium text-bearish">
                {stats.maxPriceChange.toFixed(1)}% ({stats.maxPriceAsset})
              </span>
            </div>
          )}
        </div>

        {/* 최근 적중 */}
        {stats.latest && (
          <div className="mt-4 p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground mb-1">💎 최근 적중</div>
            <div className="text-sm font-medium">
              {stats.latest.asset}
              {stats.latest.priceChange !== undefined && (
                <span className="text-bearish ml-1">
                  {stats.latest.priceChange.toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground ml-1">
                ({stats.latest.daysAgo}일 전)
              </span>
            </div>
          </div>
        )}

        {/* 전체 보기 버튼 */}
        <DialogTrigger asChild>
          <button className="mt-4 w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium transition-colors">
            전체 기록 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <PaginatedPredictionList 
          items={hits} 
          title="역지표 적중 기록" 
          emoji="🍯" 
        />
      </DialogContent>
    </Dialog>
  )
}

// 전인구 적중 카드
function CorrectCard({ stats, hits }: { stats: CorrectStats; hits: Prediction[] }) {
  return (
    <Dialog>
      <div className={cn(
        'rounded-2xl border p-5 h-full',
        'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
        'border-blue-500/30'
      )}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📈</span>
          <span className="font-bold text-lg">전인구 적중</span>
        </div>

        {/* 메인 스탯 */}
        <div className="mb-4">
          <div className="text-3xl font-bold tabular-nums text-blue-500">
            {stats.count}<span className="text-lg text-muted-foreground">/{stats.total}건</span>
          </div>
          <div className="mt-2 relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="absolute right-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="mt-1 text-right text-sm font-medium text-blue-500">
            {stats.percentage.toFixed(1)}%
          </div>
        </div>

        {/* 기간별 */}
        <PeriodStats byPeriod={stats.byPeriod} type="correct" />

        {/* 추가 통계 */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-bullish" />
            <span className="text-muted-foreground">평균 순변동폭:</span>
            <span className="font-medium text-bullish">+{Math.abs(stats.avgPriceChange).toFixed(1)}%</span>
          </div>
          {stats.maxPriceAsset && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">최대:</span>
              <span className="font-medium text-bullish">
                +{Math.abs(stats.maxPriceChange).toFixed(1)}% ({stats.maxPriceAsset})
              </span>
            </div>
          )}
        </div>

        {/* 최근 적중 */}
        {stats.latest && (
          <div className="mt-4 p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground mb-1">💎 최근 적중</div>
            <div className="text-sm font-medium">
              {stats.latest.asset}
              {stats.latest.priceChange !== undefined && (
                <span className="text-bullish ml-1">
                  +{Math.abs(stats.latest.priceChange).toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground ml-1">
                ({stats.latest.daysAgo}일 전)
              </span>
            </div>
          </div>
        )}

        {/* 전체 보기 버튼 */}
        <DialogTrigger asChild>
          <button className="mt-4 w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors">
            전체 기록 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <PaginatedPredictionList 
          items={hits} 
          title="전인구 적중 기록" 
          emoji="📈" 
        />
      </DialogContent>
    </Dialog>
  )
}

// 대기 중 카드
function PendingCard({ stats, pending }: { stats: PendingStats; pending: Prediction[] }) {
  return (
    <Dialog>
      <div className={cn(
        'rounded-2xl border p-5 h-full',
        'bg-gradient-to-br from-gray-500/10 to-gray-500/5',
        'border-gray-500/30'
      )}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⏳</span>
          <span className="font-bold text-lg">결과 대기</span>
        </div>

        {/* 메인 스탯 */}
        <div className="mb-4">
          <div className="text-3xl font-bold tabular-nums">
            {stats.count}<span className="text-lg text-muted-foreground">건 분석 중</span>
          </div>
        </div>

        {/* 다음 결과 발표 */}
        {stats.nextResults.length > 0 && (
          <div className="rounded-lg bg-background/50 p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">📅 다음 결과 발표</div>
            {stats.nextResults.slice(0, 3).map((result, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    result.direction === 'bullish' 
                      ? 'bg-bullish/10 text-bullish' 
                      : 'bg-bearish/10 text-bearish'
                  )}>
                    {result.direction === 'bullish' ? '상승' : '하락'}
                  </span>
                  <span className="font-medium">{result.asset}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  D-{result.daysLeft}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 전체 보기 버튼 */}
        <DialogTrigger asChild>
          <button className="mt-4 w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
            전체 목록 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <PaginatedPredictionList 
          items={pending} 
          title="결과 대기 중" 
          emoji="⏳" 
        />
      </DialogContent>
    </Dialog>
  )
}

export function PredictionSummaryCards({
  honeyStats,
  correctStats,
  pendingStats,
  honeyHits,
  jigHits,
  pendingReviews,
  className,
}: PredictionSummaryCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      <HoneyCard stats={honeyStats} hits={honeyHits} />
      <CorrectCard stats={correctStats} hits={jigHits} />
      <PendingCard stats={pendingStats} pending={pendingReviews} />
    </div>
  )
}
