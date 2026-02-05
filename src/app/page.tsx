'use client'

import { useState, useEffect } from 'react'
import { Beaker, TrendingUp, TrendingDown, Target, Flame, BarChart3, Clock } from 'lucide-react'
import { 
  HoneyIndexChart,
  PredictionCard,
  TimelineChart,
  VoteCard,
} from '@/components/domain'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Pagination } from '@/components/ui/pagination'

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
}

interface TimelineData {
  label: string
  year: number
  month: number
  predictions: number
  honeyIndex: number
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
  honeyHits: Prediction[]
  jigHits: Prediction[]
  pendingReviews: Prediction[]
  recentPredictions: Prediction[]
  updatedAt: string | null
}

// 종목 이름 매핑
const ASSET_NAMES: Record<string, string> = {
  KOSPI: '코스피',
  SP500: 'S&P 500',
  NASDAQ: '나스닥',
  Samsung: '삼성전자',
  SKHynix: 'SK하이닉스',
  Nvidia: '엔비디아',
  Tesla: '테슬라',
  Bitcoin: '비트코인',
}

const ITEMS_PER_PAGE = 10

// 예측 탭 컴포넌트
function PredictionTabs({ stats }: { stats: Stats | null }) {
  const [honeyPage, setHoneyPage] = useState(1)
  const [jigPage, setJigPage] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)

  if (!stats) return null

  const honeyHits = stats.honeyHits || []
  const jigHits = stats.jigHits || []
  const pendingReviews = stats.pendingReviews || []

  const honeyTotalPages = Math.ceil(honeyHits.length / ITEMS_PER_PAGE)
  const jigTotalPages = Math.ceil(jigHits.length / ITEMS_PER_PAGE)
  const pendingTotalPages = Math.ceil(pendingReviews.length / ITEMS_PER_PAGE)

  const paginatedHoney = honeyHits.slice((honeyPage - 1) * ITEMS_PER_PAGE, honeyPage * ITEMS_PER_PAGE)
  const paginatedJig = jigHits.slice((jigPage - 1) * ITEMS_PER_PAGE, jigPage * ITEMS_PER_PAGE)
  const paginatedPending = pendingReviews.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE)

  return (
    <section>
      <Tabs defaultValue="honey">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="honey" className="gap-1 text-xs sm:text-sm">
              <span>🍯</span>
              <span className="hidden sm:inline">전반꿀</span>
              <Badge variant="honey" className="ml-1 text-xs">{honeyHits.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="jig" className="gap-1 text-xs sm:text-sm">
              <span>📈</span>
              <span className="hidden sm:inline">전인구</span>
              <Badge variant="outline" className="ml-1 text-xs">{jigHits.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
              <span>🔍</span>
              <span className="hidden sm:inline">검토</span>
              <Badge variant="pending" className="ml-1 text-xs">{pendingReviews.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="honey">
          {paginatedHoney.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedHoney.map((prediction, idx) => (
                  <a
                    key={`honey-${prediction.videoId}-${idx}`}
                    href={`https://youtube.com/watch?v=${prediction.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <PredictionCard
                      title={prediction.title}
                      thumbnail={prediction.thumbnail}
                      publishedAt={prediction.publishedAt}
                      asset={ASSET_NAMES[prediction.asset] || prediction.asset}
                      predictedDirection={prediction.predictedDirection}
                      status={prediction.status}
                      actualDirection={prediction.actualDirection}
                    />
                  </a>
                ))}
              </div>
              <Pagination
                currentPage={honeyPage}
                totalPages={honeyTotalPages}
                onPageChange={setHoneyPage}
                className="mt-6"
              />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              아직 전반꿀 적중 데이터가 없습니다
            </div>
          )}
        </TabsContent>

        <TabsContent value="jig">
          {paginatedJig.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedJig.map((prediction, idx) => (
                  <a
                    key={`jig-${prediction.videoId}-${idx}`}
                    href={`https://youtube.com/watch?v=${prediction.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <PredictionCard
                      title={prediction.title}
                      thumbnail={prediction.thumbnail}
                      publishedAt={prediction.publishedAt}
                      asset={ASSET_NAMES[prediction.asset] || prediction.asset}
                      predictedDirection={prediction.predictedDirection}
                      status={prediction.status}
                      actualDirection={prediction.actualDirection}
                    />
                  </a>
                ))}
              </div>
              <Pagination
                currentPage={jigPage}
                totalPages={jigTotalPages}
                onPageChange={setJigPage}
                className="mt-6"
              />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              아직 전인구 적중 데이터가 없습니다
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {paginatedPending.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedPending.map((prediction, idx) => (
                  <a
                    key={`pending-${prediction.videoId}-${idx}`}
                    href={`https://youtube.com/watch?v=${prediction.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <PredictionCard
                      title={prediction.title}
                      thumbnail={prediction.thumbnail}
                      publishedAt={prediction.publishedAt}
                      asset={ASSET_NAMES[prediction.asset] || prediction.asset}
                      predictedDirection={prediction.predictedDirection as any}
                      status="pending"
                    />
                  </a>
                ))}
              </div>
              <Pagination
                currentPage={pendingPage}
                totalPages={pendingTotalPages}
                onPageChange={setPendingPage}
                className="mt-6"
              />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              검토 대기 항목이 없습니다
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleVote = (direction: 'up' | 'down') => {
    setUserVote(prev => prev === direction ? null : direction)
    // TODO: Supabase 연동 시 여기서 투표 저장
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">데이터 로딩중...</p>
        </div>
      </div>
    )
  }

  const honeyIndex = stats?.overallHoneyIndex ?? 0
  const isHoneyValid = honeyIndex >= 50
  const latestPending = stats?.pendingReviews?.[0]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Beaker className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="font-bold text-base sm:text-lg">전반꿀 연구소</span>
            </div>
            
            <Badge variant={isHoneyValid ? "honey" : "outline"} className="gap-1">
              <span>🍯</span>
              <span className="font-bold">{honeyIndex.toFixed(1)}%</span>
            </Badge>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section - 반응형 2열 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* 꿀지수 게이지 */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <HoneyIndexChart 
              currentValue={honeyIndex}
              totalPredictions={stats?.totalPredictions ?? 0}
            />
          </div>
          
          {/* 투표 카드 */}
          {latestPending ? (
            <VoteCard
              videoId={latestPending.videoId}
              title={latestPending.title}
              thumbnail={latestPending.thumbnail}
              publishedAt={latestPending.publishedAt}
              asset={ASSET_NAMES[latestPending.asset] || latestPending.asset}
              userVote={userVote}
              upVotes={42}
              downVotes={31}
              onVote={handleVote}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl">🍯</span>
                  <h2 className="text-xl sm:text-2xl font-bold">전반꿀 지수란?</h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  전인구경제연구소의 예측이 <strong className="text-foreground">역지표</strong>로 
                  얼마나 유효한지 측정한 지수입니다.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2 sm:p-3 rounded-lg bg-bullish/10 border border-bullish/20">
                    <p className="text-xs sm:text-sm text-muted-foreground">긍정적 언급 후</p>
                    <p className="text-sm sm:text-base font-semibold text-bullish">하락하면 🍯</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-bearish/10 border border-bearish/20">
                    <p className="text-xs sm:text-sm text-muted-foreground">부정적 언급 후</p>
                    <p className="text-sm sm:text-base font-semibold text-bearish">상승하면 🍯</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">총 예측</span>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats?.totalPredictions ?? 0}</p>
          </div>
          
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">역지표 적중</span>
              <TrendingUp className="w-4 h-4 text-bullish" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-bullish">{stats?.honeyCount ?? 0}</p>
          </div>
          
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">분석 영상</span>
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats?.totalVideos ?? 0}</p>
          </div>
          
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">검토 대기</span>
              <Clock className="w-4 h-4 text-pending" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-pending">{stats?.pendingReviewCount ?? 0}</p>
          </div>
        </div>
        
        {/* 종목별 통계 */}
        {stats?.assetStats && stats.assetStats.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-base sm:text-lg font-semibold">종목별 꿀지수</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stats.assetStats
                .sort((a, b) => b.honeyIndex - a.honeyIndex)
                .map((asset) => (
                <div 
                  key={asset.asset}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm sm:text-base">
                      {ASSET_NAMES[asset.asset] || asset.asset}
                    </span>
                    <Badge variant={asset.honeyIndex >= 50 ? "honey" : "outline"}>
                      {asset.honeyIndex.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={asset.honeyIndex} 
                    className="h-2 mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {asset.honey}/{asset.total} 적중
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* 월별 타임라인 */}
        {stats?.timeline && stats.timeline.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-base sm:text-lg font-semibold">월별 꿀지수 추이</h2>
              </div>
              <Badge variant="outline" className="w-fit">
                50% 이상 = 역지표 유효
              </Badge>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <TimelineChart data={stats.timeline} />
            </div>
          </section>
        )}
        
        {/* 예측 분석 탭 */}
        <PredictionTabs stats={stats} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 sm:py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="text-center sm:text-left">
              본 사이트는 엔터테인먼트 목적으로 제작되었습니다. 투자 조언이 아닙니다.
            </p>
            <div className="flex items-center gap-4">
              {stats?.updatedAt && (
                <span>
                  업데이트: {new Date(stats.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
              <a 
                href="https://github.com/yundoun/junbankkullab" 
                className="hover:text-foreground transition-colors"
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
