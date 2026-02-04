'use client'

import { useState, useEffect } from 'react'
import { LatestPrediction } from '@/components/LatestPrediction'
import { HoneyIndexChart } from '@/components/HoneyIndexChart'
import { HoneyIndex } from '@/components/HoneyIndex'
import { RecentPredictions } from '@/components/RecentPredictions'
import { AssetStats } from '@/components/AssetStats'
import { Header } from '@/components/Header'

export default function Home() {
  const [stats, setStats] = useState<any>(null)
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
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[var(--text-secondary)] text-sm">데이터 로딩중</p>
        </div>
      </div>
    )
  }

  // Get latest prediction (most recent with pending status or clear sentiment)
  const latestPrediction = stats?.recentPredictions?.[0]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section - Two Column Layout */}
        <section className="mb-8 sm:mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Prediction - Voting */}
            {latestPrediction && (
              <LatestPrediction
                videoId={latestPrediction.videoId}
                title={latestPrediction.title}
                thumbnail={latestPrediction.thumbnail}
                publishedAt={latestPrediction.publishedAt}
                asset={latestPrediction.asset}
                predictedDirection={latestPrediction.predictedDirection}
              />
            )}

            {/* Honey Index Chart */}
            <HoneyIndexChart
              currentValue={stats?.overallHoneyIndex ?? 50}
              totalPredictions={stats?.totalPredictions ?? 0}
            />
          </div>
        </section>

        {/* Stats Overview */}
        <section className="mb-8 sm:mb-12">
          <HoneyIndex 
            percentage={stats?.overallHoneyIndex ?? 0} 
            totalPredictions={stats?.totalPredictions ?? 0}
          />
        </section>

        {/* Asset Stats */}
        {stats?.assetStats?.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
              종목별 역상관 지수
            </h2>
            <AssetStats assets={stats.assetStats} />
          </section>
        )}

        {/* Recent Predictions */}
        {stats?.recentPredictions?.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
              최근 예측 분석
            </h2>
            <RecentPredictions predictions={stats.recentPredictions} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
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
                className="hover:text-[var(--text-secondary)] transition-colors"
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
