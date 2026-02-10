import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Supabase 클라이언트 (읽기 전용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 종목명 한글 변환
const ASSET_KO: Record<string, string> = {
  'KOSPI': '코스피',
  'NASDAQ': '나스닥',
  'SP500': 'S&P500',
  'Samsung': '삼성전자',
  'SKHynix': 'SK하이닉스',
  'Nvidia': '엔비디아',
  'Google': '구글',
  'Tesla': '테슬라',
  'Bitcoin': '비트코인',
  'Semiconductor': '반도체',
  'Shipbuilding': '조선',
  'Battery': '2차전지',
  'Bio': '바이오',
  'Nuclear': '원전',
  'Defense': '방산',
  'Bank': '은행',
  'Steel': '철강',
  'Auto': '자동차',
  'Chemical': '화학',
  'Energy': '에너지',
  'Celltrion': '셀트리온',
  'Internet': '인터넷',
  'Retail': '유통',
}

const toKorean = (asset: string) => ASSET_KO[asset] || asset

export async function GET() {
  try {
    // 1. 전체 통계 조회
    const { data: allAnalyses, error: analysesError } = await supabase
      .from('analyses')
      .select(`
        id,
        video_id,
        asset,
        ticker,
        tone,
        tone_reasoning,
        analyzed_at,
        videos!inner (
          id,
          title,
          thumbnail_url,
          published_at,
          status
        ),
        market_data (
          trading_date,
          previous_close,
          close_price,
          price_change,
          direction,
          predicted_direction,
          is_honey,
          judgment_reasoning
        )
      `)
      .order('analyzed_at', { ascending: false })

    if (analysesError) {
      console.error('Supabase error:', analysesError)
      throw analysesError
    }

    // 2. 통계 계산 (market_data는 1:1 관계라 객체로 반환됨)
    const analyses = allAnalyses || []
    const withMarketData = analyses.filter(a => a.market_data != null)
    const validAnalyses = withMarketData.filter(a => (a.market_data as any)?.is_honey !== null)
    const honeyHits = validAnalyses.filter(a => (a.market_data as any)?.is_honey === true)
    const jigHits = validAnalyses.filter(a => (a.market_data as any)?.is_honey === false)

    const honeyIndex = validAnalyses.length > 0
      ? Math.round((honeyHits.length / validAnalyses.length) * 1000) / 10
      : 0

    // 3. 종목별 통계
    const assetMap = new Map<string, { total: number; honey: number }>()
    for (const a of validAnalyses) {
      const stats = assetMap.get(a.asset) || { total: 0, honey: 0 }
      stats.total++
      if ((a.market_data as any)?.is_honey) stats.honey++
      assetMap.set(a.asset, stats)
    }

    const assetStats = Array.from(assetMap.entries())
      .map(([asset, stats]) => ({
        asset: toKorean(asset),
        assetKey: asset, // 원본 키 유지
        total: stats.total,
        honey: stats.honey,
        honeyIndex: Math.round((stats.honey / stats.total) * 1000) / 10,
      }))
      .sort((a, b) => b.honeyIndex - a.honeyIndex || b.total - a.total)

    // 4. 월별 타임라인
    const monthlyMap = new Map<string, { predictions: number; honey: number }>()
    for (const a of validAnalyses) {
      const video = a.videos as any
      const date = new Date(video.published_at)
      const key = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
      const stats = monthlyMap.get(key) || { predictions: 0, honey: 0 }
      stats.predictions++
      if ((a.market_data as any)?.is_honey) stats.honey++
      monthlyMap.set(key, stats)
    }

    const timeline = Array.from(monthlyMap.entries())
      .map(([label, stats]) => {
        const [year, month] = label.split('.').map(Number)
        return {
          label,
          year,
          month,
          predictions: stats.predictions,
          honeyIndex: Math.round((stats.honey / stats.predictions) * 1000) / 10,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))

    // 5. 전체 비디오 수 조회
    const { count: totalVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })

    // 6. 멘션 변환 함수 (market_data는 1:1 관계라 객체)
    const mapMention = (a: any) => {
      const video = a.videos as any
      const md = a.market_data // 객체로 반환됨
      return {
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail_url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        publishedAt: video.published_at,
        asset: toKorean(a.asset),
        assetKey: a.asset, // 원본 키 유지
        predictedDirection: md?.predicted_direction || (a.tone === 'positive' ? 'bullish' : 'bearish'),
        actualDirection: md?.direction === 'up' ? 'bullish' : md?.direction === 'down' ? 'bearish' : undefined,
        isHoney: md?.is_honey,
        status: md?.is_honey !== undefined
          ? (md.is_honey ? 'correct' : 'incorrect')
          : 'pending',
        priceChange: md?.price_change ?? undefined,
        tradingDate: md?.trading_date || undefined,
      }
    }

    // 7. 검토 대기 (unanalyzed 또는 market_data 없음)
    const { data: pendingVideos } = await supabase
      .from('videos')
      .select('*')
      .eq('status', 'unanalyzed')
      .order('published_at', { ascending: false })
      .limit(50)

    const pendingReviews = (pendingVideos || []).map(v => ({
      videoId: v.id,
      title: v.title,
      thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      publishedAt: v.published_at,
      asset: 'Unknown',
      predictedDirection: 'neutral',
      status: 'pending',
    }))

    // 8. 투표 가능 항목 (24시간 이내)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: recentVideos } = await supabase
      .from('videos')
      .select(`
        *,
        analyses (
          asset,
          tone
        )
      `)
      .gte('published_at', yesterday.toISOString())
      .eq('status', 'analyzed')
      .order('published_at', { ascending: false })

    const votableItems = (recentVideos || [])
      .flatMap(v => {
        const analyses = v.analyses || []
        return analyses
          .filter((a: any) => a.tone && a.tone !== 'neutral')
          .map((a: any) => ({
            videoId: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            publishedAt: v.published_at,
            asset: toKorean(a.asset),
            assetKey: a.asset,
            predictedDirection: a.tone === 'positive' ? 'bullish' : 'bearish',
            expiresAt: new Date(new Date(v.published_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          }))
      })

    // 9. 제외 항목 수
    const { count: excludedCount } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'excluded')

    return NextResponse.json({
      // 핵심 지표
      overallHoneyIndex: honeyIndex,
      totalPredictions: validAnalyses.length,
      honeyCount: honeyHits.length,

      // 메타 정보
      totalVideos: totalVideos || 0,
      totalMentions: analyses.length,
      pendingReviewCount: pendingReviews.length,

      // 분석 퍼널
      funnel: {
        totalVideos: totalVideos || 0,
        withMentions: analyses.length,
        withTone: analyses.filter(a => a.tone !== 'neutral').length,
        withMarketData: withMarketData.length,
        honeyHits: honeyHits.length,
      },

      // 제외/미분석
      unanalyzedCount: pendingReviews.length,
      excludedCount: excludedCount || 0,

      // 종목별 통계
      assetStats,

      // 월별 타임라인
      timeline,

      // 투표 가능 항목
      votableItems,

      // 탭별 예측 목록
      honeyHits: honeyHits.map(mapMention),
      jigHits: jigHits.map(mapMention),
      pendingReviews,

      // 하위 호환
      recentPredictions: validAnalyses.slice(0, 20).map(mapMention),

      // 업데이트 시간
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching stats from Supabase:', error)

    return NextResponse.json({
      overallHoneyIndex: 0,
      totalPredictions: 0,
      honeyCount: 0,
      totalVideos: 0,
      totalMentions: 0,
      pendingReviewCount: 0,
      assetStats: [],
      votableItems: [],
      honeyHits: [],
      jigHits: [],
      pendingReviews: [],
      recentPredictions: [],
      updatedAt: null,
      error: 'Failed to fetch from Supabase',
    })
  }
}
