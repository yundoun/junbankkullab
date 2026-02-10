'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AssetResult {
  asset: string
  ticker: string
  predictedDirection: string
  actualDirection: string
  isHoney: boolean
  priceChange?: number
  closePrice?: number
  previousClose?: number
  tradingDate?: string
}

interface VideoDetail {
  videoId: string
  title: string
  publishedAt: string
  thumbnail: string
  youtubeUrl: string
  analysis: {
    method: string
    model: string
    toneAnalysis: {
      tone: 'positive' | 'negative' | 'neutral'
      keywords?: string[]
      reasoning?: string
    }
    detectedAssets: Array<{
      asset: string
      ticker: string
      matchedText?: string
      reasoning?: string
    }>
  } | null
  overallJudgment: {
    predictedDirection: string
    actualDirection: string
    isHoney: boolean
    reasoning: string | null
  }
  assetResults: AssetResult[]
  summary: {
    totalAssets: number
    honeyCount: number
    isOverallHoney: boolean
  }
}

// 종목 한글 이름 매핑
const ASSET_NAMES: Record<string, string> = {
  KOSPI: '코스피',
  SP500: 'S&P 500',
  NASDAQ: '나스닥',
  Samsung: '삼성전자',
  SKHynix: 'SK하이닉스',
  Nvidia: '엔비디아',
  Google: '구글',
  Tesla: '테슬라',
  Bitcoin: '비트코인',
  Shipbuilding: '조선주',
  Defense: '방산주',
  Battery: '2차전지',
  Bio: '바이오',
}

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.videoId as string
  
  const [data, setData] = useState<VideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoId) return

    fetch(`/api/video/${videoId}`)
      .then(res => {
        if (!res.ok) throw new Error('Video not found')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [videoId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">영상을 찾을 수 없습니다</p>
        <Link href="/" className="text-primary hover:underline">
          ← 홈으로 돌아가기
        </Link>
      </div>
    )
  }

  const isHoney = data.summary.isOverallHoney

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold truncate flex-1">분석 상세</h1>
          <a
            href={data.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* YouTube Embed */}
        <div className="aspect-video rounded-xl overflow-hidden bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={data.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Title & Meta */}
        <div>
          <h2 className="text-xl font-bold">{data.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(data.publishedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* 🎯 판정 결과 카드 (히어로) */}
        <div className={cn(
          "rounded-2xl border-2 p-6",
          isHoney 
            ? "bg-amber-500/10 border-amber-500/30" 
            : "bg-blue-500/10 border-blue-500/30"
        )}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{isHoney ? '🍯' : '📈'}</span>
            <div>
              <h3 className={cn(
                "text-2xl font-bold",
                isHoney ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
              )}>
                {isHoney ? '전반꿀 적중!' : '전인구 적중'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isHoney 
                  ? '전인구 예측의 반대로 움직였습니다' 
                  : '전인구 예측대로 움직였습니다'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">전인구 예측</p>
              <p className={cn(
                "text-lg font-bold flex items-center gap-2",
                data.overallJudgment.predictedDirection === 'bullish' 
                  ? "text-bullish" 
                  : "text-bearish"
              )}>
                {data.overallJudgment.predictedDirection === 'bullish' ? (
                  <><TrendingUp className="w-5 h-5" /> 상승</>
                ) : (
                  <><TrendingDown className="w-5 h-5" /> 하락</>
                )}
              </p>
            </div>
            <div className="bg-background/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">실제 결과</p>
              <p className={cn(
                "text-lg font-bold flex items-center gap-2",
                data.overallJudgment.actualDirection === 'bullish' 
                  ? "text-bullish" 
                  : "text-bearish"
              )}>
                {data.overallJudgment.actualDirection === 'bullish' ? (
                  <><TrendingUp className="w-5 h-5" /> 상승</>
                ) : (
                  <><TrendingDown className="w-5 h-5" /> 하락</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 📊 분석 근거 */}
        {data.analysis && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <span>📊</span> 분석 근거
            </h3>
            
            {data.analysis.toneAnalysis.reasoning && (
              <p className="text-sm text-muted-foreground mb-4">
                {data.analysis.toneAnalysis.reasoning}
              </p>
            )}

            {data.analysis.toneAnalysis.keywords && data.analysis.toneAnalysis.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.analysis.toneAnalysis.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary">
                    #{keyword}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              분석 모델: {data.analysis.model} ({data.analysis.method})
            </p>
          </div>
        )}

        {/* 📈 종목별 결과 */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <span>📈</span> 종목별 결과
          </h3>
          
          <div className="space-y-4">
            {data.assetResults.map((result, idx) => (
              <div 
                key={idx}
                className={cn(
                  "rounded-xl border",
                  result.isHoney ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/30 border-border"
                )}
              >
                {/* 종목 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{result.isHoney ? '🍯' : '📊'}</span>
                    <div>
                      <p className="font-semibold">
                        {ASSET_NAMES[result.asset] || result.asset}
                      </p>
                      {result.ticker && (
                        <p className="text-xs text-muted-foreground">{result.ticker}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-bold tabular-nums",
                      result.priceChange !== undefined && result.priceChange >= 0 
                        ? "text-bullish" 
                        : "text-bearish"
                    )}>
                      {result.priceChange !== undefined 
                        ? `${result.priceChange >= 0 ? '+' : ''}${result.priceChange.toFixed(2)}%`
                        : '-'}
                    </p>
                    <p className={cn(
                      "text-xs font-medium",
                      result.isHoney ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                      {result.isHoney ? '역지표 적중!' : '예측대로'}
                    </p>
                  </div>
                </div>
                
                {/* 시장 데이터 상세 */}
                <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                  {result.tradingDate && (
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-muted-foreground mb-0.5">분석 기준일</p>
                      <p className="font-medium">
                        {new Date(result.tradingDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  
                  {result.previousClose !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">전일 종가</p>
                      <p className="font-medium tabular-nums">
                        {result.previousClose.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  
                  {result.closePrice !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">당일 종가</p>
                      <p className="font-medium tabular-nums">
                        {result.closePrice.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 데이터 출처 */}
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-muted-foreground/70">
                    📊 데이터 출처: Yahoo Finance (yfinance)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back button */}
        <div className="pt-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  )
}
