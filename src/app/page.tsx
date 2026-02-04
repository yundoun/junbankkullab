'use client'

import { useState, useEffect } from 'react'
import { HoneyIndex } from '@/components/HoneyIndex'
import { RecentPredictions } from '@/components/RecentPredictions'
import { AssetStats } from '@/components/AssetStats'

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

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          🍯 전반꿀 연구소
        </h1>
        <p className="text-xl text-gray-400">
          "전인구 반대로 하면 꿀" — 과연 사실일까?
        </p>
        <p className="text-sm text-gray-500 mt-2">
          데이터 기반 검증 프로젝트
        </p>
      </header>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto"></div>
          <p className="mt-4 text-gray-400">데이터 로딩 중...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Honey Index */}
          <HoneyIndex 
            percentage={stats?.overallHoneyIndex ?? 0} 
            totalPredictions={stats?.totalPredictions ?? 0}
          />

          {/* Asset Stats Grid */}
          <section>
            <h2 className="text-2xl font-bold mb-4">📊 종목별 전반꿀 지수</h2>
            <AssetStats assets={stats?.assetStats ?? []} />
          </section>

          {/* Recent Predictions Timeline */}
          <section>
            <h2 className="text-2xl font-bold mb-4">🕐 최근 예측 vs 실제</h2>
            <RecentPredictions predictions={stats?.recentPredictions ?? []} />
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-16 pb-8">
        <p>⚠️ 이 사이트는 엔터테인먼트 목적입니다. 투자 조언 아님.</p>
        <p className="mt-2">
          Made with 🍯 by{' '}
          <a 
            href="https://github.com/karl-ai-dev" 
            className="text-honey hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Karl
          </a>
        </p>
      </footer>
    </main>
  )
}
