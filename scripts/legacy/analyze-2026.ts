/**
 * 2026년 영상 분석 + 시장 데이터 수집
 */

import { config } from 'dotenv'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'

config({ path: '.env.local' })

// Asset patterns
const ASSET_PATTERNS: Record<string, { patterns: RegExp[], symbol: string, type: 'crypto' | 'stock' | 'index' }> = {
  Bitcoin: { patterns: [/비트코인/i, /btc/i], symbol: 'BTCUSDT', type: 'crypto' },
  Ethereum: { patterns: [/이더리움/i, /eth(?!er)/i, /이더(?!리움)/], symbol: 'ETHUSDT', type: 'crypto' },
  KOSPI: { patterns: [/코스피/i, /kospi/i], symbol: 'KOSPI', type: 'index' },
  NASDAQ: { patterns: [/나스닥/i, /nasdaq/i], symbol: 'NASDAQ', type: 'index' },
  SP500: { patterns: [/s&p/i, /에스앤피/i], symbol: 'SP500', type: 'index' },
  Tesla: { patterns: [/테슬라/i, /tesla/i, /tsla/i], symbol: 'Tesla', type: 'stock' },
  Samsung: { patterns: [/삼성전자/i, /삼전(?!자)/i], symbol: 'Samsung', type: 'stock' },
  SKHynix: { patterns: [/sk하이닉스/i, /하이닉스/i], symbol: 'SKHynix', type: 'stock' },
  Nvidia: { patterns: [/엔비디아/i, /nvidia/i, /nvda/i], symbol: 'Nvidia', type: 'stock' },
  Gold: { patterns: [/금값/i, /금가격/i, /금\s*사야/i, /\b금\b.*오르/i], symbol: 'Gold', type: 'stock' },
  Silver: { patterns: [/은값/i, /\b은\b.*오르/i, /\b은\b.*사야/i], symbol: 'Silver', type: 'stock' },
  Dollar: { patterns: [/달러/i, /환율/i, /usd/i], symbol: 'Dollar', type: 'index' },
}

const BULLISH_PATTERNS = [
  { pattern: /상승/i, weight: 1 },
  { pattern: /오른다/i, weight: 1 },
  { pattern: /올라/i, weight: 1 },
  { pattern: /급등/i, weight: 2 },
  { pattern: /폭등/i, weight: 2 },
  { pattern: /사야/i, weight: 1.5 },
  { pattern: /매수/i, weight: 1 },
  { pattern: /기회/i, weight: 0.5 },
  { pattern: /저점/i, weight: 1 },
  { pattern: /반등/i, weight: 1 },
  { pattern: /회복/i, weight: 0.5 },
  { pattern: /돌파/i, weight: 1 },
  { pattern: /신고가/i, weight: 1.5 },
  { pattern: /호재/i, weight: 1 },
  { pattern: /성공/i, weight: 0.5 },
  { pattern: /크게\s*오르/i, weight: 1.5 },
  { pattern: /많이\s*오르/i, weight: 1.5 },
  { pattern: /더\s*오르/i, weight: 1 },
  { pattern: /대박/i, weight: 1 },
]

const BEARISH_PATTERNS = [
  { pattern: /하락/i, weight: 1 },
  { pattern: /떨어/i, weight: 1 },
  { pattern: /내려/i, weight: 1 },
  { pattern: /급락/i, weight: 2 },
  { pattern: /폭락/i, weight: 2 },
  { pattern: /팔아/i, weight: 1.5 },
  { pattern: /팔자/i, weight: 1.5 },
  { pattern: /매도/i, weight: 1 },
  { pattern: /위험/i, weight: 0.5 },
  { pattern: /고점/i, weight: 0.5 },
  { pattern: /조정/i, weight: 0.5 },
  { pattern: /붕괴/i, weight: 2 },
  { pattern: /위기/i, weight: 1 },
  { pattern: /조심/i, weight: 1 },
  { pattern: /무서/i, weight: 0.5 },
  { pattern: /끔찍/i, weight: 1 },
  { pattern: /충격/i, weight: 0.5 },
]

interface Video {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
}

interface AnalyzedPrediction {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  // Analysis
  detectedAssets: string[]
  bullishKeywords: string[]
  bearishKeywords: string[]
  bullishScore: number
  bearishScore: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentConfidence: number
  // Per-asset predictions
  predictions: AssetPrediction[]
}

interface AssetPrediction {
  asset: string
  symbol: string
  type: 'crypto' | 'stock' | 'index'
  predictedDirection: 'bullish' | 'bearish'
  // Market data (if available)
  priceAtPublish?: number
  priceAfter24h?: number
  priceChange?: number
  actualDirection?: 'up' | 'down'
  isHoney?: boolean
  dataSource?: string
}

// Fetch crypto price at timestamp from Binance
async function getCryptoPriceAt(symbol: string, timestamp: number): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      symbol,
      interval: '1h',
      startTime: String(timestamp),
      limit: '1',
    })

    const response = await fetch(`https://api.binance.com/api/v3/klines?${params}`)
    if (!response.ok) return null

    const data = await response.json()
    if (!data.length) return null

    return parseFloat(data[0][4])
  } catch {
    return null
  }
}

// Fetch stock/index price using Python yfinance
function getStockPrice(symbol: string, timestampMs: number, hoursAfter = 24): { priceAt: number, priceAfter: number, change: number, direction: 'up' | 'down' } | null {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'market_data.py')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
    
    const result = execSync(`${pythonPath} ${scriptPath} ${symbol} ${timestampMs} ${hoursAfter}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const data = JSON.parse(result.trim())
    if (data.error) return null
    
    return {
      priceAt: data.priceAt,
      priceAfter: data.priceAfter,
      change: data.change,
      direction: data.direction
    }
  } catch {
    return null
  }
}

function analyzeTitle(title: string) {
  // Detect assets
  const detectedAssets: string[] = []
  for (const [asset, config] of Object.entries(ASSET_PATTERNS)) {
    if (config.patterns.some(p => p.test(title))) {
      detectedAssets.push(asset)
    }
  }

  // Detect keywords
  const bullishKeywords: string[] = []
  const bearishKeywords: string[] = []
  let bullishScore = 0
  let bearishScore = 0

  for (const { pattern, weight } of BULLISH_PATTERNS) {
    const match = title.match(pattern)
    if (match) {
      bullishKeywords.push(match[0])
      bullishScore += weight
    }
  }

  for (const { pattern, weight } of BEARISH_PATTERNS) {
    const match = title.match(pattern)
    if (match) {
      bearishKeywords.push(match[0])
      bearishScore += weight
    }
  }

  // Determine sentiment
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const totalScore = bullishScore + bearishScore
  let sentimentConfidence = 0

  if (totalScore > 0) {
    if (bullishScore > bearishScore) {
      sentiment = 'bullish'
      sentimentConfidence = (bullishScore - bearishScore) / totalScore
    } else if (bearishScore > bullishScore) {
      sentiment = 'bearish'
      sentimentConfidence = (bearishScore - bullishScore) / totalScore
    }
  }

  return {
    detectedAssets,
    bullishKeywords,
    bearishKeywords,
    bullishScore,
    bearishScore,
    sentiment,
    sentimentConfidence,
  }
}

async function main() {
  console.log('=== 2026년 영상 분석 + 시장 데이터 ===\n')

  // Load raw videos
  const rawData = await fs.readFile('./data/videos-2026-raw.json', 'utf-8')
  const videos: Video[] = JSON.parse(rawData)

  console.log(`총 ${videos.length}개 영상 분석 시작...\n`)

  const now = Date.now()
  const analyzed: AnalyzedPrediction[] = []
  let marketDataFetched = 0

  for (const video of videos) {
    const analysis = analyzeTitle(video.title)
    
    const prediction: AnalyzedPrediction = {
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      publishedAt: video.publishedAt,
      ...analysis,
      predictions: [],
    }

    // Skip if no clear sentiment or no assets detected
    if (analysis.sentiment === 'neutral' || analysis.detectedAssets.length === 0) {
      analyzed.push(prediction)
      continue
    }

    // Create predictions for each detected asset
    for (const asset of analysis.detectedAssets) {
      const assetConfig = ASSET_PATTERNS[asset]
      if (!assetConfig) continue

      const assetPrediction: AssetPrediction = {
        asset,
        symbol: assetConfig.symbol,
        type: assetConfig.type,
        predictedDirection: analysis.sentiment,
      }

      // Try to fetch market data if 24h has passed
      const publishTime = new Date(video.publishedAt).getTime()
      const after24h = publishTime + 24 * 60 * 60 * 1000

      if (after24h <= now) {
        if (assetConfig.type === 'crypto') {
          const priceAt = await getCryptoPriceAt(assetConfig.symbol, publishTime)
          const priceAfter = await getCryptoPriceAt(assetConfig.symbol, after24h)

          if (priceAt && priceAfter) {
            assetPrediction.priceAtPublish = priceAt
            assetPrediction.priceAfter24h = priceAfter
            assetPrediction.priceChange = ((priceAfter - priceAt) / priceAt) * 100
            assetPrediction.actualDirection = assetPrediction.priceChange >= 0 ? 'up' : 'down'
            assetPrediction.isHoney = (
              (analysis.sentiment === 'bullish' && assetPrediction.actualDirection === 'down') ||
              (analysis.sentiment === 'bearish' && assetPrediction.actualDirection === 'up')
            )
            assetPrediction.dataSource = 'binance'
            marketDataFetched++
          }
          await new Promise(r => setTimeout(r, 50))
        } else {
          const result = getStockPrice(assetConfig.symbol, publishTime, 24)
          if (result) {
            assetPrediction.priceAtPublish = result.priceAt
            assetPrediction.priceAfter24h = result.priceAfter
            assetPrediction.priceChange = result.change
            assetPrediction.actualDirection = result.direction
            assetPrediction.isHoney = (
              (analysis.sentiment === 'bullish' && assetPrediction.actualDirection === 'down') ||
              (analysis.sentiment === 'bearish' && assetPrediction.actualDirection === 'up')
            )
            assetPrediction.dataSource = 'yfinance'
            marketDataFetched++
          }
        }
      }

      prediction.predictions.push(assetPrediction)
    }

    analyzed.push(prediction)
  }

  // Calculate stats
  const withPredictions = analyzed.filter(a => a.predictions.length > 0)
  const allAssetPredictions = withPredictions.flatMap(a => a.predictions)
  const withMarketData = allAssetPredictions.filter(p => p.isHoney !== undefined)
  const honeyCount = withMarketData.filter(p => p.isHoney).length
  const honeyIndex = withMarketData.length > 0 ? (honeyCount / withMarketData.length) * 100 : 0

  console.log('\n=== 분석 결과 ===\n')
  console.log(`총 영상: ${videos.length}`)
  console.log(`예측 가능 영상 (자산+센티먼트 감지): ${withPredictions.length}`)
  console.log(`개별 자산 예측: ${allAssetPredictions.length}`)
  console.log(`시장 데이터 확보: ${withMarketData.length}`)
  console.log(`꿀 적중: ${honeyCount} / ${withMarketData.length}`)
  console.log(`Honey Index: ${honeyIndex.toFixed(1)}%`)

  // Print detailed results
  console.log('\n=== 예측 상세 ===\n')
  
  for (const pred of withPredictions) {
    const date = new Date(pred.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    console.log(`[${date}] ${pred.title}`)
    console.log(`  감지된 자산: ${pred.detectedAssets.join(', ')}`)
    console.log(`  센티먼트: ${pred.sentiment} (강세: ${pred.bullishScore.toFixed(1)}, 약세: ${pred.bearishScore.toFixed(1)})`)
    console.log(`  강세 키워드: ${pred.bullishKeywords.join(', ') || '없음'}`)
    console.log(`  약세 키워드: ${pred.bearishKeywords.join(', ') || '없음'}`)
    
    for (const ap of pred.predictions) {
      if (ap.isHoney !== undefined) {
        const emoji = ap.isHoney ? '🍯' : '❌'
        console.log(`  → ${ap.asset}: ${ap.predictedDirection} vs 실제 ${ap.actualDirection} (${ap.priceChange?.toFixed(2)}%) ${emoji}`)
      } else {
        console.log(`  → ${ap.asset}: ${ap.predictedDirection} (시장 데이터 없음)`)
      }
    }
    console.log('')
  }

  // Save results
  const output = {
    analyzedAt: new Date().toISOString(),
    stats: {
      totalVideos: videos.length,
      videosWithPredictions: withPredictions.length,
      totalAssetPredictions: allAssetPredictions.length,
      predictionsWithMarketData: withMarketData.length,
      honeyCount,
      honeyIndex,
    },
    predictions: analyzed,
  }

  await fs.writeFile('./data/analysis-2026.json', JSON.stringify(output, null, 2))
  console.log('저장됨: ./data/analysis-2026.json')
}

main().catch(console.error)
