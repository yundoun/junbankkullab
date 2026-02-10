/**
 * 개별 영상 상세 정보 API
 * GET /api/video/[videoId]
 * 
 * Supabase에서 특정 videoId에 대한 모든 분석 데이터 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const { videoId } = params

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  try {
    // 1. 비디오 기본 정보 조회
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // 2. 분석 결과 + 시장 데이터 조회
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select(`
        id,
        asset,
        ticker,
        matched_text,
        confidence,
        asset_reasoning,
        tone,
        tone_keywords,
        tone_reasoning,
        llm_model,
        analyzed_at,
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
      .eq('video_id', videoId)

    if (analysesError) {
      console.error('Analyses fetch error:', analysesError)
    }

    const analysisResults = analyses || []

    // 3. 종목별 결과 변환
    const assetResults = analysisResults.map(a => {
      const md = a.market_data?.[0]
      return {
        asset: a.asset,
        ticker: a.ticker || '',
        predictedDirection: md?.predicted_direction || (a.tone === 'positive' ? 'bullish' : 'bearish'),
        actualDirection: md?.direction === 'up' ? 'bullish' : md?.direction === 'down' ? 'bearish' : undefined,
        isHoney: md?.is_honey || false,
        priceChange: md?.price_change ?? undefined,
        closePrice: md?.close_price ?? undefined,
        previousClose: md?.previous_close ?? undefined,
        tradingDate: md?.trading_date ?? undefined,
        reasoning: md?.judgment_reasoning ?? undefined,
      }
    })

    // 4. 첫 번째 분석 결과에서 톤 정보 추출
    const firstAnalysis = analysisResults[0]
    const hasAnalysis = analysisResults.length > 0 && firstAnalysis?.tone

    const response = {
      videoId,
      title: video.title,
      publishedAt: video.published_at,
      thumbnail: video.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      status: video.status,

      // 분석 정보
      analysis: hasAnalysis ? {
        method: 'llm',
        model: firstAnalysis.llm_model,
        toneAnalysis: {
          tone: firstAnalysis.tone,
          keywords: firstAnalysis.tone_keywords,
          reasoning: firstAnalysis.tone_reasoning,
        },
        detectedAssets: analysisResults.map(a => ({
          asset: a.asset,
          ticker: a.ticker,
          matchedText: a.matched_text,
          confidence: a.confidence,
          reasoning: a.asset_reasoning,
        })),
      } : null,

      // 전체 판정 (첫 번째 기준)
      overallJudgment: hasAnalysis && firstAnalysis.market_data?.[0] ? {
        predictedDirection: firstAnalysis.market_data[0].predicted_direction,
        actualDirection: firstAnalysis.market_data[0].direction === 'up' ? 'bullish' 
          : firstAnalysis.market_data[0].direction === 'down' ? 'bearish' : undefined,
        isHoney: firstAnalysis.market_data[0].is_honey,
        reasoning: firstAnalysis.market_data[0].judgment_reasoning,
      } : null,

      // 종목별 결과
      assetResults,

      // 꿀 적중 여부 요약
      summary: {
        totalAssets: assetResults.length,
        honeyCount: assetResults.filter(a => a.isHoney).length,
        isOverallHoney: assetResults.some(a => a.isHoney),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching video details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
