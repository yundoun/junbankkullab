'use client'

import { useState, useEffect } from 'react'
import { Beaker, TrendingUp, BarChart3, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  HeroChart,
  HeroScoreboard,
  PredictionCard,
  VoteCard,
  AnalysisFunnel,
  TodaySignal,
  ShareButtons,
  TopHoneyHits,
  PredictionSummaryCards,
} from '@/components/domain'
import { Badge } from '@/components/ui/badge'

interface AssetStat {
  asset: string
  total: number
  honey: number
  honeyIndex: number
}

interface Prediction {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  actualDirection?: 'bullish' | 'bearish'
  isHoney?: boolean
  status: 'correct' | 'incorrect' | 'pending'
  priceChange?: number
  tradingDate?: string
}

interface TimelineData {
  label: string
  year: number
  month: number
  predictions: number
  honey: number
  honeyIndex: number
}

interface VotableItem {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  expiresAt: string
}

interface FunnelData {
  totalVideos: number
  withMentions: number
  withTone: number
  withMarketData: number
  honeyHits: number
}

// 기간별 데이터 타입
interface PeriodData {
  value: number
  total: number
  honey: number
}

interface TopHit {
  rank: number
  videoId: string
  title: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  priceChange: number
  publishedAt: string
  thumbnail: string
  tradingDate?: string
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
}

interface HoneyStats {
  count: number
  total: number
  percentage: number
  avgPriceChange: number
  maxPriceChange: number
  maxPriceAsset: string | null
  byPeriod: { '1d': number; '1w': number; '1m': number; '3m': number }
  latest: LatestItem | null
}

interface CorrectStats {
  count: number
  total: number
  percentage: number
  avgPriceChange: number
  maxPriceChange: number
  maxPriceAsset: string | null
  byPeriod: { '1d': number; '1w': number; '1m': number; '3m': number }
  latest: LatestItem | null
}

interface PendingStats {
  count: number
  nextResults: NextResult[]
}

interface Stats {
  overallHoneyIndex: number
  totalPredictions: number
  honeyCount: number
  totalVideos: number
  totalMentions: number
  pendingReviewCount: number
  assetStats: AssetStat[]
  timeline: TimelineData[]
  votableItems: VotableItem[]
  honeyHits: Prediction[]
  jigHits: Prediction[]
  pendingReviews: Prediction[]
  recentPredictions: Prediction[]
  updatedAt: string | null
  funnel?: FunnelData
  unanalyzedCount?: number
  excludedCount?: number
  // 기간별 꿀지수
  honeyIndexByPeriod?: {
    '1d': PeriodData
    '1w': PeriodData
    '1m': PeriodData
    '3m': PeriodData
  }
  defaultPeriod?: '1d' | '1w' | '1m' | '3m'
  // 상세 통계 (카드 UI용)
  topHoneyHits?: TopHit[]
  honeyStats?: HoneyStats
  correctStats?: CorrectStats
  pendingStats?: PendingStats
}

// 종목 이름 매핑
const ASSET_NAMES: Record<string, string> = {
  KOSPI: '코스피',
  SP500: 'S&P 500',
  NASDAQ: '나스닥',
  Samsung: '삼성전자',
  SKHynix: 'SK하이닉스',
  Nvidia: '엔비디아',
  Google: '구글',
  Tesla: '테슬라',
  Bitcoin: '비트코인',
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-14 h-14 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">데이터 분석중...</p>
        </div>
      </div>
    )
  }

  const honeyIndex = stats?.overallHoneyIndex ?? 0
  const isHoneyValid = honeyIndex >= 50
  const votableItems = stats?.votableItems ?? []
  const hasVotableItems = votableItems.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md animate-fade-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                <Beaker className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300 group-hover:rotate-12" />
              </div>
              <span className="font-bold text-base sm:text-lg">전반꿀 연구소</span>
            </div>
            
            <Badge 
              variant={isHoneyValid ? "honey" : "outline"} 
              className={cn(
                "gap-1 transition-all duration-300 hover:scale-105",
                isHoneyValid && "animate-pulse-glow"
              )}
            >
              <span>🍯</span>
              <span className="font-bold">{honeyIndex.toFixed(1)}%</span>
            </Badge>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 오늘의 시그널 - 최신 예측 기반 액셔너블 인사이트 */}
        {stats?.recentPredictions && stats.recentPredictions.length > 0 && (
          <div className="animate-fade-down mb-6 sm:mb-8">
            <TodaySignal predictions={stats.recentPredictions} />
          </div>
        )}

        {/* Hero: 스코어보드 (전체 너비) */}
        <div className="animate-scale-in mb-6 sm:mb-8">
          <HeroScoreboard
            honeyCount={stats?.honeyCount ?? 0}
            correctCount={(stats?.totalPredictions ?? 0) - (stats?.honeyCount ?? 0)}
            totalPredictions={stats?.totalPredictions ?? 0}
            honeyIndex={honeyIndex}
            honeyIndexByPeriod={stats?.honeyIndexByPeriod}
            defaultPeriod={stats?.defaultPeriod ?? '1m'}
          />
          {/* 공유 버튼 */}
          <div className="flex justify-end mt-3">
            <ShareButtons honeyIndex={honeyIndex} />
          </div>
        </div>
        
        {/* 월별 트렌드 차트 (선택적 표시) */}
        {stats?.timeline && stats.timeline.length > 3 && (
          <div className="animate-fade-up fill-backwards delay-100 mb-6 sm:mb-8">
            <HeroChart
              currentIndex={honeyIndex}
              totalPredictions={stats?.totalPredictions ?? 0}
              honeyCount={stats?.honeyCount ?? 0}
              timeline={stats?.timeline ?? []}
            />
          </div>
        )}

        {/* 투표 섹션 - 반응형 그리드 */}
        {hasVotableItems ? (
          <section className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl animate-bounce-subtle">🗳️</span>
              <h2 className="text-base sm:text-lg font-semibold">진행 중인 투표</h2>
              <Badge variant="honey" className="animate-pulse">{votableItems.length}개</Badge>
            </div>
            <div className={cn(
              "grid gap-4",
              votableItems.length === 1 && "grid-cols-1",
              votableItems.length === 2 && "grid-cols-1 md:grid-cols-2",
              votableItems.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              {votableItems.map((item, idx) => {
                const itemKey = `${item.videoId}_${item.asset}`
                
                return (
                  <VoteCard
                    key={itemKey}
                    videoId={item.videoId}
                    title={item.title}
                    thumbnail={item.thumbnail}
                    publishedAt={item.publishedAt}
                    asset={ASSET_NAMES[item.asset] || item.asset}
                    predictedDirection={item.predictedDirection}
                    expiresAt={item.expiresAt}
                    index={idx}
                  />
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-200">
            <div className="rounded-2xl border border-dashed border-border bg-card/30 backdrop-blur-sm p-8 text-center transition-all duration-300 hover:border-primary/30 hover:bg-card/50">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center animate-float">
                <TrendingUp className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">현재 진행 중인 투표가 없습니다</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                새 영상이 업로드되고 종목 예측이 감지되면 투표가 시작됩니다.
              </p>
            </div>
          </section>
        )}

        {/* 📊 분석 퍼널 */}
        {stats?.funnel && (
          <div className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-300">
            <AnalysisFunnel
              funnel={stats.funnel}
              unanalyzedCount={stats.unanalyzedCount ?? 0}
              excludedCount={stats.excludedCount ?? 0}
            />
          </div>
        )}
        
        {/* 종목별 통계 */}
        {stats?.assetStats && stats.assetStats.length > 0 && (
          <section className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-400">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-base sm:text-lg font-semibold">종목별 꿀지수</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stats.assetStats
                .sort((a, b) => b.honeyIndex - a.honeyIndex)
                .map((asset, idx) => (
                <div 
                  key={asset.asset}
                  className={cn(
                    "p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm",
                    "card-hover animate-fade-up fill-backwards",
                    asset.honeyIndex >= 50 && "hover:glow-bullish"
                  )}
                  style={{ animationDelay: `${500 + idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm sm:text-base">
                      {ASSET_NAMES[asset.asset] || asset.asset}
                    </span>
                    <Badge 
                      variant={asset.honeyIndex >= 50 ? "honey" : "outline"}
                      className="transition-all duration-300 hover:scale-105"
                    >
                      {asset.honeyIndex.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="relative h-2 mb-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                        asset.honeyIndex >= 50 
                          ? "bg-gradient-to-r from-bullish to-bullish/80" 
                          : "bg-gradient-to-r from-muted-foreground to-muted-foreground/80"
                      )}
                      style={{ 
                        width: `${asset.honeyIndex}%`,
                        animationDelay: `${700 + idx * 50}ms`
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className={asset.honeyIndex >= 50 ? "text-bullish font-medium" : ""}>
                      {asset.honey}
                    </span>
                    /{asset.total} 적중
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* 🏆 역대급 역지표 TOP 5 */}
        {stats?.topHoneyHits && stats.topHoneyHits.length > 0 && (
          <section className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-450">
            <TopHoneyHits hits={stats.topHoneyHits} />
          </section>
        )}

        {/* 예측 요약 카드 (3열) */}
        {stats?.honeyStats && stats?.correctStats && stats?.pendingStats && (
          <section className="mb-6 sm:mb-8 animate-fade-up fill-backwards delay-500">
            <PredictionSummaryCards
              honeyStats={stats.honeyStats}
              correctStats={stats.correctStats}
              pendingStats={stats.pendingStats}
              honeyHits={stats.honeyHits || []}
              jigHits={stats.jigHits || []}
              pendingReviews={stats.pendingReviews || []}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 sm:py-6 mt-auto bg-card/30 backdrop-blur-sm animate-fade-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="text-center sm:text-left">
              본 사이트는 엔터테인먼트 목적으로 제작되었습니다. 투자 조언이 아닙니다.
            </p>
            <div className="flex items-center gap-4">
              {stats?.updatedAt && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  업데이트: {new Date(stats.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
              <a 
                href="https://github.com/yundoun/junbankkullab" 
                className="hover:text-primary transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
