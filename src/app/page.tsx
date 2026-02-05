'use client'

import { useState, useEffect } from 'react'
import { Beaker, TrendingUp, TrendingDown, Target, Flame, BarChart3, Clock } from 'lucide-react'
import { 
  BentoGrid, 
  BentoCard, 
  BentoCardHeader, 
  BentoCardTitle, 
  BentoCardContent,
  BentoCardValue,
  HoneyIndexChart,
  PredictionCard,
  TimelineChart,
} from '@/components/domain'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

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
  pendingReview: number
  assetStats: AssetStat[]
  timeline: TimelineData[]
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">데이터 로딩중...</p>
        </div>
      </div>
    )
  }

  const honeyIndex = stats?.overallHoneyIndex ?? 0
  const isHoneyValid = honeyIndex >= 50 // 50% 이상이면 역지표 가설 유효

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Beaker className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">전반꿀 연구소</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={isHoneyValid ? "honey" : "outline"} className="gap-1.5">
                <span>🍯</span>
                <span className="font-bold">{honeyIndex.toFixed(1)}%</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <BentoGrid className="mb-8">
          {/* Honey Index Chart - Large */}
          <BentoCard size="lg" className="p-0 overflow-hidden">
            <HoneyIndexChart 
              currentValue={honeyIndex}
              totalPredictions={stats?.totalPredictions ?? 0}
            />
          </BentoCard>
          
          {/* 핵심 설명 카드 */}
          <BentoCard size="lg" className="flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-4xl">🍯</span>
                <h2 className="text-2xl font-bold">전반꿀 지수란?</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                전인구경제연구소의 예측이 <strong className="text-foreground">역지표</strong>로 
                얼마나 유효한지 측정한 지수입니다.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-bullish/10 border border-bullish/20">
                  <p className="text-sm text-muted-foreground">긍정적 언급 후</p>
                  <p className="font-semibold text-bullish">하락하면 🍯</p>
                </div>
                <div className="p-3 rounded-lg bg-bearish/10 border border-bearish/20">
                  <p className="text-sm text-muted-foreground">부정적 언급 후</p>
                  <p className="font-semibold text-bearish">상승하면 🍯</p>
                </div>
              </div>
              {isHoneyValid && (
                <Badge variant="honey" className="mt-2">
                  ✓ 50% 이상 = 역지표 가설 유효
                </Badge>
              )}
            </div>
          </BentoCard>
          
          {/* Stats Cards - Small */}
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>총 예측</BentoCardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue>{stats?.totalPredictions ?? 0}</BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">유효 분석 건수</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>역지표 적중</BentoCardTitle>
              <TrendingUp className="w-4 h-4 text-bullish" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue className="text-bullish">
                {stats?.honeyCount ?? 0}
              </BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.totalPredictions ? 
                  `${stats.totalPredictions}개 중 ${stats.honeyCount}개` : 
                  '데이터 없음'}
              </p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>분석 영상</BentoCardTitle>
              <Flame className="w-4 h-4 text-primary" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue>{stats?.totalVideos ?? 0}</BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">수집된 영상</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>검토 대기</BentoCardTitle>
              <Clock className="w-4 h-4 text-pending" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue className="text-pending">
                {stats?.pendingReview ?? 0}
              </BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">수동 검토 필요</p>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
        
        {/* 종목별 통계 */}
        {stats?.assetStats && stats.assetStats.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">종목별 꿀지수</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.assetStats
                .sort((a, b) => b.honeyIndex - a.honeyIndex)
                .map((asset) => (
                <div 
                  key={asset.asset}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
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
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">월별 꿀지수 추이</h2>
              </div>
              <Badge variant="outline">
                50% 이상 = 역지표 유효
              </Badge>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <TimelineChart data={stats.timeline} />
            </div>
          </section>
        )}
        
        {/* Recent Predictions */}
        {stats?.recentPredictions && stats.recentPredictions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">최근 분석</h2>
              </div>
              <Badge variant="outline">{stats.recentPredictions.length}개</Badge>
            </div>
            <div className="space-y-3">
              {stats.recentPredictions.slice(0, 10).map((prediction, idx) => (
                <PredictionCard
                  key={`${prediction.videoId}-${idx}`}
                  title={prediction.title}
                  thumbnail={prediction.thumbnail}
                  publishedAt={prediction.publishedAt}
                  asset={ASSET_NAMES[prediction.asset] || prediction.asset}
                  predictedDirection={prediction.predictedDirection}
                  status={prediction.status}
                  actualDirection={prediction.actualDirection}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              본 사이트는 엔터테인먼트 목적으로 제작되었습니다. 투자 조언이 아닙니다.
            </p>
            <div className="flex items-center gap-4">
              {stats?.updatedAt && (
                <span>
                  마지막 업데이트: {new Date(stats.updatedAt).toLocaleDateString('ko-KR')}
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
