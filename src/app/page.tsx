'use client'

import { useState, useEffect } from 'react'
import { Beaker, TrendingUp, TrendingDown, Target, Flame } from 'lucide-react'
import { 
  BentoGrid, 
  BentoCard, 
  BentoCardHeader, 
  BentoCardTitle, 
  BentoCardContent,
  BentoCardValue,
  HoneyGauge,
  VoteCard,
  PredictionCard,
} from '@/components/domain'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleVote = (videoId: string, direction: 'up' | 'down') => {
    setUserVotes(prev => ({
      ...prev,
      [videoId]: prev[videoId] === direction ? null : direction
    }))
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

  const latestPrediction = stats?.recentPredictions?.[0]
  const honeyIndex = stats?.overallHoneyIndex ?? 50

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Beaker className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">전반꿀 연구소</span>
            </div>
            
            {/* Right side - placeholder for auth */}
            <div className="flex items-center gap-4">
              <Badge variant="honey" className="gap-1.5">
                <span>🍯</span>
                <span className="font-bold">0</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section - Bento Grid */}
        <BentoGrid className="mb-8">
          {/* Vote Card - Large */}
          {latestPrediction && (
            <BentoCard size="lg" className="p-0">
              <VoteCard
                videoId={latestPrediction.videoId}
                title={latestPrediction.title}
                thumbnail={latestPrediction.thumbnail}
                publishedAt={latestPrediction.publishedAt}
                asset={latestPrediction.asset}
                predictedDirection={latestPrediction.predictedDirection}
                userVote={userVotes[latestPrediction.videoId]}
                upVotes={127}
                downVotes={89}
                onVote={(dir) => handleVote(latestPrediction.videoId, dir)}
                className="h-full border-0"
              />
            </BentoCard>
          )}
          
          {/* Honey Gauge - Large */}
          <BentoCard size="lg" className="flex flex-col">
            <BentoCardHeader>
              <BentoCardTitle className="flex items-center gap-2">
                <span>🍯</span>
                전반꿀 지수
              </BentoCardTitle>
              <Badge variant={honeyIndex >= 60 ? 'bullish' : honeyIndex <= 40 ? 'bearish' : 'pending'}>
                {honeyIndex >= 60 ? '역지표 강세' : honeyIndex <= 40 ? '역지표 약세' : '중립'}
              </Badge>
            </BentoCardHeader>
            <BentoCardContent className="flex-1 flex flex-col justify-center">
              <HoneyGauge 
                value={honeyIndex} 
                size="lg"
                animated
              />
            </BentoCardContent>
          </BentoCard>
          
          {/* Stats Cards - Small */}
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>총 예측</BentoCardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue>{stats?.totalPredictions ?? 0}</BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">분석된 예측</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>적중률</BentoCardTitle>
              <TrendingUp className="w-4 h-4 text-bullish" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue className="text-bullish">
                {stats?.assetStats?.[0]?.honeyIndex?.toFixed(1) ?? '0'}%
              </BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">역상관 적중</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>분석 종목</BentoCardTitle>
              <Flame className="w-4 h-4 text-primary" />
            </BentoCardHeader>
            <BentoCardContent>
              <BentoCardValue>{stats?.assetStats?.length ?? 0}</BentoCardValue>
              <p className="text-sm text-muted-foreground mt-1">활성 종목</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard size="sm">
            <BentoCardHeader>
              <BentoCardTitle>최근 결과</BentoCardTitle>
              <TrendingDown className="w-4 h-4 text-bearish" />
            </BentoCardHeader>
            <BentoCardContent>
              <div className="flex gap-1">
                {/* Mock recent results */}
                {['correct', 'correct', 'incorrect', 'correct', 'pending'].map((result, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      result === 'correct' ? 'bg-bullish' :
                      result === 'incorrect' ? 'bg-bearish' :
                      'bg-pending'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">최근 5개</p>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
        
        {/* Recent Predictions */}
        {stats?.recentPredictions?.length > 1 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">최근 예측 분석</h2>
              <Badge variant="outline">{stats.recentPredictions.length}개</Badge>
            </div>
            <div className="space-y-3">
              {stats.recentPredictions.slice(1, 6).map((prediction: any) => (
                <PredictionCard
                  key={prediction.videoId}
                  title={prediction.title}
                  thumbnail={prediction.thumbnail}
                  publishedAt={prediction.publishedAt}
                  asset={prediction.asset}
                  predictedDirection={prediction.predictedDirection || 'neutral'}
                  status={prediction.status || 'pending'}
                  actualDirection={prediction.actualDirection}
                  priceChange={prediction.priceChange}
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
              {stats?.collectedAt && (
                <span>
                  마지막 업데이트: {new Date(stats.collectedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
              <a 
                href="https://github.com/karl-ai-dev/junbankkullab" 
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
