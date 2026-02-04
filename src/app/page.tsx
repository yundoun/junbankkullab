'use client'

import { useState, useEffect } from 'react'
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

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <HoneyIndex 
            percentage={stats?.overallHoneyIndex ?? 0} 
            totalPredictions={stats?.totalPredictions ?? 0}
          />
        </section>

        {/* Asset Stats */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            종목별 역상관 지수
          </h2>
          <AssetStats assets={stats?.assetStats ?? []} />
        </section>

        {/* Recent Predictions */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            최근 예측 분석
          </h2>
          <RecentPredictions predictions={stats?.recentPredictions ?? []} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[var(--text-muted)] text-xs">
            본 사이트는 엔터테인먼트 목적으로 제작되었습니다. 투자 조언이 아닙니다.
          </p>
          <p className="text-center text-[var(--text-muted)] text-xs mt-2">
            <a 
              href="https://github.com/karl-ai-dev/junbankkullab" 
              className="hover:text-[var(--text-secondary)] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
