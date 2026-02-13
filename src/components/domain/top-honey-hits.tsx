'use client'

import * as React from 'react'
import { Trophy, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopHit {
  rank: number
  videoId: string
  title: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  priceChange: number
  publishedAt: string
  thumbnail: string
}

interface TopHoneyHitsProps {
  hits: TopHit[]
  className?: string
}

const RANK_STYLES: Record<number, { emoji: string; border: string; bg: string }> = {
  1: { emoji: '🥇', border: 'border-amber-500/50', bg: 'bg-amber-500/5' },
  2: { emoji: '🥈', border: 'border-gray-400/50', bg: 'bg-gray-400/5' },
  3: { emoji: '🥉', border: 'border-amber-700/50', bg: 'bg-amber-700/5' },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

export function TopHoneyHits({ hits, className }: TopHoneyHitsProps) {
  if (!hits || hits.length === 0) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold">역대급 역지표 TOP 5</h2>
        <span className="text-xs text-muted-foreground">(변동폭 큰 순)</span>
      </div>

      {/* 카드 리스트 */}
      <div className="grid gap-3">
        {hits.map((hit) => {
          const rankStyle = RANK_STYLES[hit.rank] || { emoji: `${hit.rank}`, border: 'border-border', bg: '' }
          const isPredictedUp = hit.predictedDirection === 'bullish'
          const actualDown = hit.priceChange < 0

          return (
            <a
              key={`${hit.videoId}-${hit.asset}`}
              href={`https://youtube.com/watch?v=${hit.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group block rounded-xl border p-4 transition-all duration-200',
                'hover:shadow-lg hover:scale-[1.01]',
                rankStyle.border,
                rankStyle.bg,
                hit.rank === 1 && 'ring-1 ring-amber-500/30'
              )}
            >
              <div className="flex items-start gap-4">
                {/* 랭크 */}
                <div className="flex-shrink-0 text-2xl">
                  {rankStyle.emoji}
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 min-w-0">
                  {/* 종목 + 날짜 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-foreground">{hit.asset}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(hit.publishedAt)}</span>
                  </div>

                  {/* 예측 vs 실제 */}
                  <div className="space-y-2">
                    {/* 예측 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">예측:</span>
                      <span className={cn(
                        'flex items-center gap-1 font-medium',
                        isPredictedUp ? 'text-bullish' : 'text-bearish'
                      )}>
                        {isPredictedUp ? (
                          <><TrendingUp className="w-4 h-4" /> 상승</>
                        ) : (
                          <><TrendingDown className="w-4 h-4" /> 하락</>
                        )}
                      </span>
                    </div>

                    {/* 실제 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">실제:</span>
                      <span className={cn(
                        'flex items-center gap-1 font-bold text-lg',
                        actualDown ? 'text-bearish' : 'text-bullish'
                      )}>
                        {actualDown ? (
                          <TrendingDown className="w-5 h-5" />
                        ) : (
                          <TrendingUp className="w-5 h-5" />
                        )}
                        {hit.priceChange > 0 ? '+' : ''}{hit.priceChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="mt-3">
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'absolute h-full rounded-full transition-all duration-500',
                          actualDown ? 'bg-bearish left-1/2' : 'bg-bullish right-1/2',
                          actualDown ? 'origin-left' : 'origin-right'
                        )}
                        style={{ 
                          width: `${Math.min(Math.abs(hit.priceChange) * 2, 50)}%`,
                          transform: actualDown ? 'translateX(-100%)' : 'translateX(0)'
                        }}
                      />
                      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-border -translate-x-1/2" />
                    </div>
                  </div>

                  {/* 역지표 태그 */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-amber-500 font-medium">
                      🍯 역지표 대성공
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
