/**
 * 개별 영상 상세 정보 API
 * GET /api/video/[videoId]
 * 
 * 특정 videoId에 대한 모든 분석 데이터 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AnalyzedItem {
  videoId: string
  title: string
  publishedAt: string
  analysis?: {
    method: string
    model: string
    detectedAssets: Array<{
      asset: string
      ticker: string
      matchedText?: string
      confidence?: number
      reasoning?: string
    }>
    toneAnalysis: {
      tone: 'positive' | 'negative' | 'neutral'
      keywords?: string[]
      reasoning?: string
    }
  }
  marketData?: {
    asset: string
    ticker: string
    closePrice: number
    previousClose?: number
    priceChange?: number
    direction: 'up' | 'down' | 'flat'
    tradingDate: string
  }
  judgment?: {
    predictedDirection: string
    actualDirection: string
    isHoney: boolean
    reasoning: string
  }
  // v2 format fields
  asset?: string
  tone?: 'positive' | 'negative'
  actualDirection?: 'up' | 'down' | 'flat'
  isHoney?: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const { videoId } = params

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  try {
    const dataDir = path.join(process.cwd(), 'data')
    const results: AnalyzedItem[] = []

    // 모든 월별 폴더 검색
    const years = await fs.readdir(dataDir)
    
    for (const year of years) {
      if (!/^\d{4}$/.test(year)) continue
      
      const yearPath = path.join(dataDir, year)
      const months = await fs.readdir(yearPath)
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month)
        const analyzedPath = path.join(monthPath, 'analyzed.json')
        
        try {
          const data = await fs.readFile(analyzedPath, 'utf-8')
          const items: AnalyzedItem[] = JSON.parse(data)
          
          // 해당 videoId의 모든 분석 결과 수집
          const matches = items.filter(item => item.videoId === videoId)
          results.push(...matches)
        } catch {
          // 파일 없으면 무시
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // 첫 번째 결과에서 기본 정보 추출
    const first = results[0]
    
    // 모든 분석된 종목 수집 (중복 제거)
    const assetResults = results.map(r => {
      const isV3 = 'analysis' in r && 'judgment' in r
      
      if (isV3) {
        return {
          asset: r.marketData?.asset || r.analysis?.detectedAssets?.[0]?.asset || 'Unknown',
          ticker: r.marketData?.ticker || '',
          predictedDirection: r.judgment?.predictedDirection || '',
          actualDirection: r.judgment?.actualDirection || '',
          isHoney: r.judgment?.isHoney || false,
          priceChange: r.marketData?.priceChange,
          closePrice: r.marketData?.closePrice,
          tradingDate: r.marketData?.tradingDate,
        }
      } else {
        return {
          asset: r.asset || 'Unknown',
          ticker: '',
          predictedDirection: r.tone === 'positive' ? 'bullish' : 'bearish',
          actualDirection: r.actualDirection === 'up' ? 'bullish' : 'bearish',
          isHoney: r.isHoney || false,
          priceChange: undefined,
          closePrice: undefined,
          tradingDate: undefined,
        }
      }
    })

    // v3 형식인지 확인
    const isV3 = 'analysis' in first && 'judgment' in first

    const response = {
      videoId,
      title: first.title,
      publishedAt: first.publishedAt,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      
      // 분석 정보
      analysis: isV3 ? {
        method: first.analysis?.method,
        model: first.analysis?.model,
        toneAnalysis: first.analysis?.toneAnalysis,
        detectedAssets: first.analysis?.detectedAssets,
      } : null,
      
      // 전체 판정 (첫 번째 기준)
      overallJudgment: isV3 ? {
        predictedDirection: first.judgment?.predictedDirection,
        actualDirection: first.judgment?.actualDirection,
        isHoney: first.judgment?.isHoney,
        reasoning: first.judgment?.reasoning,
      } : {
        predictedDirection: first.tone === 'positive' ? 'bullish' : 'bearish',
        actualDirection: first.actualDirection === 'up' ? 'bullish' : 'bearish',
        isHoney: first.isHoney,
        reasoning: null,
      },
      
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
