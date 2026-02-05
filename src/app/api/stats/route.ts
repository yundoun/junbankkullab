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

    // 멘션을 카드 형태로 변환
    const mapMention = (m: Mention) => ({
      videoId: m.videoId,
      title: m.title,
      thumbnail: `https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`,
      publishedAt: m.publishedAt,
      asset: m.asset,
      predictedDirection: m.tone === 'positive' ? 'bullish' : 'bearish',
      actualDirection: mapDirection(m.actualDirection),
      isHoney: m.isHoney,
      status: m.isHoney !== undefined 
        ? (m.isHoney ? 'correct' : 'incorrect')
        : 'pending',
    })

    // 정렬 (최신순)
    const sortedMentions = [...parsed.mentions]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    // 🍯 전반꿀 적중 (역지표 성공)
    const honeyHits = sortedMentions
      .filter(m => m.isHoney === true)
      .map(mapMention)

    // 📈 전인구 적중 (예측대로 감)
    const jigHits = sortedMentions
      .filter(m => m.isHoney === false)
      .map(mapMention)

    // 검토 대기 목록 로드
    let pendingReviews: any[] = []
    try {
      const reviewPath = path.join(process.cwd(), 'data', 'review', 'neutral-mentions.json')
      const reviewData = await fs.readFile(reviewPath, 'utf-8')
      const neutralMentions = JSON.parse(reviewData)
      pendingReviews = neutralMentions.map((m: any) => ({
        videoId: m.videoId,
        title: m.title,
        thumbnail: `https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`,
        publishedAt: m.publishedAt,
        asset: m.asset,
        predictedDirection: 'neutral',
        status: 'pending',
      }))
    } catch {
      // 검토 파일 없으면 무시
    }

    // 하위 호환성을 위한 recentPredictions
    const recentPredictions = sortedMentions.slice(0, 20).map(mapMention)

    return NextResponse.json({
      // 핵심 지표
      overallHoneyIndex: parsed.stats.honeyIndex,
      totalPredictions: parsed.stats.validMentions,
      honeyCount: parsed.stats.honeyCount,
      
      // 메타 정보
      totalVideos: parsed.stats.totalVideos,
      totalMentions: parsed.stats.totalMentions,
      pendingReviewCount: pendingReviews.length,
      
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
      
      // 탭별 예측 목록
      honeyHits,      // 🍯 전반꿀 적중
      jigHits,        // 📈 전인구 적중
      pendingReviews, // 🔍 검토 대기
      
      // 하위 호환
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
