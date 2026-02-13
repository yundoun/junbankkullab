'use client'

import * as React from 'react'
import { Trophy, TrendingDown, TrendingUp, ExternalLink, Play, Calendar } from 'lucide-react'
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
  // 추가 데이터 (API에서 제공 시)
  startPrice?: number
  endPrice?: number
  measurementPeriod?: string  // e.g., "1개월"
  tradingDate?: string
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
          
          // 측정 기간 계산 (tradingDate가 있으면 사용)
          const measurementDays = hit.tradingDate 
            ? Math.ceil((new Date(hit.tradingDate).getTime() - new Date(hit.publishedAt).getTime()) / (1000 * 60 * 60 * 24))
            : null
          const periodLabel = hit.measurementPeriod || (measurementDays ? `${measurementDays}일 후` : '익일')

          return (
            <div
              key={`${hit.videoId}-${hit.asset}`}
              className={cn(
                'rounded-xl border p-4 transition-all duration-200',
                'hover:shadow-lg',
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
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-bold text-lg text-foreground">{hit.asset}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(hit.publishedAt)}
                    </div>
                  </div>

                  {/* 전인구 예측 */}
                  <div className="mb-3 p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">전인구 예측:</span>
                      <span className={cn(
                        'flex items-center gap-1 font-semibold',
                        isPredictedUp ? 'text-bullish' : 'text-bearish'
                      )}>
                        {isPredictedUp ? (
                          <><TrendingUp className="w-4 h-4" /> 상승</>
                        ) : (
                          <><TrendingDown className="w-4 h-4" /> 하락</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 실제 결과 박스 */}
                  <div className="rounded-lg border border-border bg-background/50 p-3 mb-3">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      📊 {periodLabel} 실제 결과
                    </div>
                    
                    {/* 가격 정보 (있을 경우) */}
                    {(hit.startPrice || hit.endPrice) && (
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        {hit.startPrice && (
                          <div>
                            <span className="text-muted-foreground text-xs">시작가</span>
                            <div className="font-medium">${hit.startPrice.toLocaleString()}</div>
                          </div>
                        )}
                        {hit.endPrice && (
                          <div>
                            <span className="text-muted-foreground text-xs">종가</span>
                            <div className={cn(
                              'font-medium',
                              actualDown ? 'text-bearish' : 'text-bullish'
                            )}>
                              ${hit.endPrice.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 변동률 - 크게 강조 */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'flex items-center gap-1.5 font-black text-2xl',
                        actualDown ? 'text-bearish' : 'text-bullish'
                      )}>
                        {actualDown ? (
                          <TrendingDown className="w-6 h-6" />
                        ) : (
                          <TrendingUp className="w-6 h-6" />
                        )}
                        {hit.priceChange > 0 ? '+' : ''}{hit.priceChange.toFixed(1)}%
                      </span>
                    </div>

                    {/* 측정일 표시 */}
                    {hit.tradingDate && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        측정일: {formatDate(hit.tradingDate)}
                      </div>
                    )}
                  </div>

                  {/* 하단: 역지표 태그 + 영상보기 버튼 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-500 font-medium">
                      🍯 역지표 대성공!
                    </span>
                    <a
                      href={`https://youtube.com/watch?v=${hit.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                        'bg-red-500/10 hover:bg-red-500/20 text-red-500',
                        'text-sm font-medium transition-colors'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Play className="w-4 h-4" />
                      영상보기
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
