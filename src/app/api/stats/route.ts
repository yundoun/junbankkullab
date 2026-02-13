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
        market_data (*)
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

    // 2.5 기간별 통계 (1d/1w/1m/3m)
    const calcPeriodStats = (field: string) => {
      const valid = withMarketData.filter(a => (a.market_data as any)?.[field] !== null && (a.market_data as any)?.[field] !== undefined)
      const honey = valid.filter(a => (a.market_data as any)?.[field] === true)
      return {
        value: valid.length > 0 ? Math.round((honey.length / valid.length) * 1000) / 10 : 0,
        total: valid.length,
        honey: honey.length,
      }
    }

    const honeyIndexByPeriod = {
      '1d': { value: honeyIndex, total: validAnalyses.length, honey: honeyHits.length },
      '1w': calcPeriodStats('is_honey_1w'),
      '1m': calcPeriodStats('is_honey_1m'),
      '3m': calcPeriodStats('is_honey_3m'),
    }

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
          honey: stats.honey,
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

    // 10. 상세 통계 계산용 헬퍼
    const honeyMapped = honeyHits.map(mapMention)
    const jigMapped = jigHits.map(mapMention)

    // 평균/최대 변동폭 계산
    const calcPriceStats = (items: any[]) => {
      const withPrice = items.filter(i => i.priceChange !== undefined && i.priceChange !== null)
      if (withPrice.length === 0) return { avg: 0, max: 0, maxAsset: null }
      
      const sum = withPrice.reduce((acc, i) => acc + Math.abs(i.priceChange), 0)
      const avg = Math.round((sum / withPrice.length) * 10) / 10
      
      const maxItem = withPrice.reduce((max, i) => 
        Math.abs(i.priceChange) > Math.abs(max.priceChange) ? i : max
      , withPrice[0])
      
      return {
        avg,
        max: Math.round(maxItem.priceChange * 10) / 10,
        maxAsset: maxItem.asset,
      }
    }

    // 최근 항목 찾기
    const findLatest = (items: any[]) => {
      if (items.length === 0) return null
      const sorted = [...items].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      const latest = sorted[0]
      const daysAgo = Math.floor(
        (Date.now() - new Date(latest.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        asset: latest.asset,
        priceChange: latest.priceChange,
        daysAgo,
      }
    }

    // 11. TOP 5 역지표 (변동폭 큰 순)
    const topHoneyHits = honeyMapped
      .filter(h => h.priceChange !== undefined && h.priceChange !== null)
      .sort((a, b) => Math.abs(b.priceChange!) - Math.abs(a.priceChange!))
      .slice(0, 5)
      .map((h, idx) => ({
        rank: idx + 1,
        videoId: h.videoId,
        title: h.title,
        asset: h.asset,
        predictedDirection: h.predictedDirection,
        priceChange: h.priceChange,
        publishedAt: h.publishedAt,
        thumbnail: h.thumbnail,
      }))

    // 12. 역지표 상세 통계
    const honeyPriceStats = calcPriceStats(honeyMapped)
    const honeyStats = {
      count: honeyHits.length,
      total: validAnalyses.length,
      percentage: honeyIndex,
      avgPriceChange: honeyPriceStats.avg,
      maxPriceChange: honeyPriceStats.max,
      maxPriceAsset: honeyPriceStats.maxAsset,
      byPeriod: {
        '1d': honeyIndexByPeriod['1d'].value,
        '1w': honeyIndexByPeriod['1w'].value,
        '1m': honeyIndexByPeriod['1m'].value,
        '3m': honeyIndexByPeriod['3m'].value,
      },
      latest: findLatest(honeyMapped),
    }

    // 13. 전인구 적중 상세 통계
    const correctPriceStats = calcPriceStats(jigMapped)
    const correctStats = {
      count: jigHits.length,
      total: validAnalyses.length,
      percentage: validAnalyses.length > 0 
        ? Math.round((jigHits.length / validAnalyses.length) * 1000) / 10 
        : 0,
      avgPriceChange: correctPriceStats.avg,
      maxPriceChange: correctPriceStats.max,
      maxPriceAsset: correctPriceStats.maxAsset,
      byPeriod: {
        '1d': 100 - honeyIndexByPeriod['1d'].value,
        '1w': 100 - honeyIndexByPeriod['1w'].value,
        '1m': 100 - honeyIndexByPeriod['1m'].value,
        '3m': 100 - honeyIndexByPeriod['3m'].value,
      },
      latest: findLatest(jigMapped),
    }

    // 14. 대기 중 통계
    const pendingAnalyses = withMarketData.filter(a => (a.market_data as any)?.is_honey === null)
    const pendingMapped = pendingAnalyses.map(mapMention)
    
    // 다음 결과 발표 예정 (tradingDate 기준)
    const nextResults = pendingMapped
      .filter(p => p.tradingDate)
      .map(p => {
        const tradingDate = new Date(p.tradingDate!)
        const daysLeft = Math.max(0, Math.ceil(
          (tradingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ))
        return {
          asset: p.asset,
          direction: p.predictedDirection,
          daysLeft,
          tradingDate: p.tradingDate,
        }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5)

    const pendingStats = {
      count: pendingAnalyses.length + pendingReviews.length,
      nextResults,
    }

    return NextResponse.json({
      // 핵심 지표
      overallHoneyIndex: honeyIndex,
      totalPredictions: validAnalyses.length,
      honeyCount: honeyHits.length,

      // 기간별 꿀지수 (1d/1w/1m/3m)
      honeyIndexByPeriod,
      defaultPeriod: '1m',

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
      honeyHits: honeyMapped,
      jigHits: jigMapped,
      pendingReviews,

      // 상세 통계 (카드 UI용)
      topHoneyHits,
      honeyStats,
      correctStats,
      pendingStats,

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
