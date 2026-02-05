import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface Period {
  year: number
  month: number
  predictions: number
  honeyIndex: number
}

interface OverallStats {
  updatedAt: string
  stats: {
    totalPredictions: number
    honeyCount: number
    honeyIndex: number
  }
  periods: Period[]
}

interface Mention {
  videoId: string
  title: string
  publishedAt: string
  asset: string
  tone: 'positive' | 'negative' | 'neutral'
  actualDirection?: 'up' | 'down' | 'flat' | 'no_data'
  isHoney?: boolean
}

interface HybridAnalysis {
  updatedAt: string
  methodology: string
  description: string
  stats: {
    totalVideos: number
    totalMentions: number
    analyzableMentions: number
    validMentions: number
    honeyCount: number
    honeyIndex: number
  }
  assetStats: {
    asset: string
    total: number
    honey: number
    honeyIndex: number
  }[]
  mentions: Mention[]
}

export async function GET() {
  try {
    // 하이브리드 분석 데이터
    const hybridPath = path.join(process.cwd(), 'data', 'stats', 'hybrid-analysis.json')
    const hybridData = await fs.readFile(hybridPath, 'utf-8')
    const parsed: HybridAnalysis = JSON.parse(hybridData)
    
    // 전체 통계 (월별 타임라인 포함)
    const overallPath = path.join(process.cwd(), 'data', 'stats', 'overall.json')
    let periods: Period[] = []
    try {
      const overallData = await fs.readFile(overallPath, 'utf-8')
      const overall: OverallStats = JSON.parse(overallData)
      periods = overall.periods || []
    } catch {
      // overall.json 없으면 무시
    }

    // 실제 방향을 PredictionDirection으로 변환
    const mapDirection = (dir?: 'up' | 'down' | 'flat' | 'no_data'): 'bullish' | 'bearish' | undefined => {
      if (dir === 'up') return 'bullish'
      if (dir === 'down') return 'bearish'
      return undefined
    }

    // 최근 예측 (isHoney가 정의된 것들)
    const recentPredictions = parsed.mentions
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20)
      .map((m) => ({
        videoId: m.videoId,
        title: m.title,
        thumbnail: `https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`,
        publishedAt: m.publishedAt,
        asset: m.asset,
        predictedDirection: m.tone === 'positive' ? 'bullish' : 'bearish',
        actualDirection: mapDirection(m.actualDirection),
        priceChange: undefined, // 상세 가격 변동은 별도 조회 필요
        isHoney: m.isHoney,
        status: m.isHoney !== undefined 
          ? (m.isHoney ? 'correct' : 'incorrect')
          : 'pending',
      }))

    return NextResponse.json({
      // 핵심 지표
      overallHoneyIndex: parsed.stats.honeyIndex,
      totalPredictions: parsed.stats.validMentions,
      honeyCount: parsed.stats.honeyCount,
      
      // 메타 정보
      totalVideos: parsed.stats.totalVideos,
      totalMentions: parsed.stats.totalMentions,
      pendingReview: parsed.stats.analyzableMentions - parsed.stats.validMentions,
      
      // 종목별 통계
      assetStats: parsed.assetStats,
      
      // 월별 타임라인
      timeline: periods.map(p => ({
        label: `${p.year}.${String(p.month).padStart(2, '0')}`,
        year: p.year,
        month: p.month,
        predictions: p.predictions,
        honeyIndex: p.honeyIndex,
      })),
      
      // 최근 예측
      recentPredictions,
      
      // 업데이트 시간
      updatedAt: parsed.updatedAt,
    })
  } catch (error) {
    console.error('Error reading hybrid analysis:', error)
    
    return NextResponse.json({
      overallHoneyIndex: 0,
      totalPredictions: 0,
      honeyCount: 0,
      totalVideos: 0,
      totalMentions: 0,
      pendingReview: 0,
      assetStats: [],
      recentPredictions: [],
      updatedAt: null,
    })
  }
}
