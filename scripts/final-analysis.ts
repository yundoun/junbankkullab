/**
 * 최종 분석: 6개 종목, 개선된 로직, 실제 시장 데이터
 */

import { config } from 'dotenv'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'

config({ path: '.env.local' })

// 6개 타겟 종목
const TARGET_ASSETS: Record<string, { patterns: RegExp[], symbol: string }> = {
  KOSPI: { patterns: [/코스피/i, /kospi/i], symbol: 'KOSPI' },
  SP500: { patterns: [/s&p/i, /에스앤피/i, /S&P\s*500/i, /S&P\s*8000/i], symbol: 'SP500' },
  NASDAQ: { patterns: [/나스닥/i, /nasdaq/i], symbol: 'NASDAQ' },
  Samsung: { patterns: [/삼성전자/i, /삼전(?!자)/i], symbol: 'Samsung' },
  SKHynix: { patterns: [/sk하이닉스/i, /하이닉스/i, /sk\s*하이닉스/i], symbol: 'SKHynix' },
  Nvidia: { patterns: [/엔비디아/i, /nvidia/i, /nvda/i], symbol: 'Nvidia' },
}

// 부정 패턴
const NEGATION_PATTERNS = [
  /아닙니다/i, /아니다/i, /않습니다/i, /않는다/i, 
  /말아야/i, /하지\s*마/i, /때가\s*아니/i
]

// Bullish 패턴
const BULLISH_PATTERNS = [
  { pattern: /상승/i, weight: 1 },
  { pattern: /오른다/i, weight: 1.5 },
  { pattern: /올라/i, weight: 1 },
  { pattern: /급등/i, weight: 2 },
  { pattern: /폭등/i, weight: 2 },
  { pattern: /지금\s*사/i, weight: 2 },
  { pattern: /꼭\s*사/i, weight: 2 },
  { pattern: /사야/i, weight: 1.5 },
  { pattern: /매수/i, weight: 1 },
  { pattern: /저점/i, weight: 1 },
  { pattern: /반등/i, weight: 1 },
  { pattern: /돌파/i, weight: 1.5 },
  { pattern: /신고가/i, weight: 2 },
  { pattern: /최고치/i, weight: 1.5 },
  { pattern: /호재/i, weight: 1 },
  { pattern: /더\s*오르/i, weight: 1.5 },
  { pattern: /많이\s*오르/i, weight: 2 },
  { pattern: /크게\s*오르/i, weight: 2 },
  { pattern: /쌉니다/i, weight: 1 },
  { pattern: /바닥/i, weight: 1 },
]

// Bearish 패턴
const BEARISH_PATTERNS = [
  { pattern: /하락/i, weight: 1 },
  { pattern: /떨어/i, weight: 1 },
  { pattern: /급락/i, weight: 2 },
  { pattern: /폭락/i, weight: 2 },
  { pattern: /지금\s*팔/i, weight: 2 },
  { pattern: /팔아야/i, weight: 1.5 },
  { pattern: /팔자/i, weight: 1.5 },
  { pattern: /매도/i, weight: 1 },
  { pattern: /조정/i, weight: 0.5 },
  { pattern: /붕괴/i, weight: 2 },
  { pattern: /조심/i, weight: 1 },
  { pattern: /천장/i, weight: 1 },
  { pattern: /끝났/i, weight: 1 },
  { pattern: /무너/i, weight: 1.5 },
]

interface Video {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
}

interface Prediction {
  videoId: string
  videoUrl: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  symbol: string
  predictedDirection: 'bullish' | 'bearish'
  hasNegation: boolean
  // Market data
  priceAtPublish?: number
  priceAfter24h?: number
  priceChange?: number
  actualDirection?: 'up' | 'down'
  isHoney?: boolean
}

function analyzeTitle(title: string) {
  const detectedAssets: string[] = []
  for (const [asset, config] of Object.entries(TARGET_ASSETS)) {
    if (config.patterns.some(p => p.test(title))) {
      detectedAssets.push(asset)
    }
  }

  const hasNeg = NEGATION_PATTERNS.some(p => p.test(title))

  let bullishScore = 0
  let bearishScore = 0

  for (const { pattern, weight } of BULLISH_PATTERNS) {
    if (pattern.test(title)) bullishScore += weight
  }

  for (const { pattern, weight } of BEARISH_PATTERNS) {
    if (pattern.test(title)) bearishScore += weight
  }

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  
  if (hasNeg) {
    if (bearishScore > bullishScore) {
      sentiment = 'bullish'
    } else if (bullishScore > bearishScore) {
      sentiment = 'bearish'
    }
  } else {
    if (bullishScore > bearishScore && bullishScore >= 1) {
      sentiment = 'bullish'
    } else if (bearishScore > bullishScore && bearishScore >= 1) {
      sentiment = 'bearish'
    }
  }

  return { detectedAssets, sentiment, hasNegation: hasNeg, bullishScore, bearishScore }
}

// yfinance로 가격 조회
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
  } catch (e) {
    console.error(`  ⚠️ ${symbol} 데이터 조회 실패`)
    return null
  }
}

async function main() {
  console.log('=== 전반꿀 지수 최종 분석 ===\n')
  console.log('종목: KOSPI, S&P500, NASDAQ, 삼성전자, SK하이닉스, 엔비디아\n')

  const rawData = await fs.readFile('./data/videos-2026-raw.json', 'utf-8')
  const videos: Video[] = JSON.parse(rawData)

  const predictions: Prediction[] = []
  const now = Date.now()

  // 1. 유효한 예측 필터링
  for (const video of videos) {
    const analysis = analyzeTitle(video.title)
    
    if (analysis.detectedAssets.length === 0 || analysis.sentiment === 'neutral') {
      continue
    }

    for (const asset of analysis.detectedAssets) {
      const config = TARGET_ASSETS[asset]
      predictions.push({
        videoId: video.id,
        videoUrl: `https://youtube.com/watch?v=${video.id}`,
        title: video.title,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        asset,
        symbol: config.symbol,
        predictedDirection: analysis.sentiment,
        hasNegation: analysis.hasNegation,
      })
    }
  }

  console.log(`유효한 예측: ${predictions.length}개\n`)
  console.log('시장 데이터 조회 중...\n')

  // 2. 시장 데이터 조회
  for (const pred of predictions) {
    const publishTime = new Date(pred.publishedAt).getTime()
    const after24h = publishTime + 24 * 60 * 60 * 1000

    if (after24h > now) {
      console.log(`  ⏳ ${pred.asset}: 아직 24시간 미경과`)
      continue
    }

    const result = getStockPrice(pred.symbol, publishTime, 24)
    
    if (result) {
      pred.priceAtPublish = result.priceAt
      pred.priceAfter24h = result.priceAfter
      pred.priceChange = result.change
      pred.actualDirection = result.direction
      pred.isHoney = (
        (pred.predictedDirection === 'bullish' && pred.actualDirection === 'down') ||
        (pred.predictedDirection === 'bearish' && pred.actualDirection === 'up')
      )
      console.log(`  ✓ ${pred.asset}: ${pred.priceChange > 0 ? '+' : ''}${pred.priceChange.toFixed(2)}%`)
    }
  }

  // 3. 결과 계산
  const withData = predictions.filter(p => p.isHoney !== undefined)
  const honeyCount = withData.filter(p => p.isHoney).length
  const honeyIndex = withData.length > 0 ? (honeyCount / withData.length) * 100 : 0

  // 종목별 통계
  const assetStats: Record<string, { total: number, honey: number, predictions: Prediction[] }> = {}
  for (const pred of withData) {
    if (!assetStats[pred.asset]) {
      assetStats[pred.asset] = { total: 0, honey: 0, predictions: [] }
    }
    assetStats[pred.asset].total++
    if (pred.isHoney) assetStats[pred.asset].honey++
    assetStats[pred.asset].predictions.push(pred)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 전반꿀 지수 결과')
  console.log('='.repeat(60))
  
  console.log(`\n🍯 전체 전반꿀 지수: ${honeyIndex.toFixed(1)}% (${honeyCount}/${withData.length})`)
  
  console.log('\n📈 종목별 전반꿀 지수:')
  for (const [asset, stats] of Object.entries(assetStats)) {
    const pct = stats.total > 0 ? (stats.honey / stats.total) * 100 : 0
    console.log(`  ${asset}: ${pct.toFixed(1)}% (${stats.honey}/${stats.total})`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 상세 결과')
  console.log('='.repeat(60))

  for (const pred of withData) {
    const date = new Date(pred.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    const emoji = pred.isHoney ? '🍯' : '❌'
    const negMark = pred.hasNegation ? ' [반전]' : ''
    const changeStr = pred.priceChange !== undefined ? 
      `${pred.priceChange >= 0 ? '+' : ''}${pred.priceChange.toFixed(2)}%` : 'N/A'
    
    console.log(`\n${emoji} [${date}] ${pred.asset}`)
    console.log(`   제목: ${pred.title.substring(0, 50)}...`)
    console.log(`   예측: ${pred.predictedDirection}${negMark} → 실제: ${pred.actualDirection} (${changeStr})`)
  }

  // 4. JSON 저장
  const output = {
    analyzedAt: new Date().toISOString(),
    methodology: {
      assets: ['KOSPI', 'SP500', 'NASDAQ', 'Samsung', 'SKHynix', 'Nvidia'],
      timeframe: '24시간',
      source: '전인구경제연구소 유튜브',
      definition: '전반꿀 지수 = (역방향 적중 수 / 전체 예측 수) × 100%',
    },
    stats: {
      totalVideos: videos.length,
      validPredictions: predictions.length,
      predictionsWithData: withData.length,
      honeyCount,
      honeyIndex: Math.round(honeyIndex * 10) / 10,
      assetStats: Object.entries(assetStats).map(([asset, s]) => ({
        asset,
        honeyIndex: Math.round((s.total > 0 ? (s.honey / s.total) * 100 : 0) * 10) / 10,
        total: s.total,
        honey: s.honey,
      })),
    },
    predictions: withData.map(p => ({
      videoId: p.videoId,
      videoUrl: p.videoUrl,
      title: p.title,
      thumbnail: p.thumbnail,
      publishedAt: p.publishedAt,
      asset: p.asset,
      predictedDirection: p.predictedDirection,
      hasNegation: p.hasNegation,
      priceAtPublish: p.priceAtPublish,
      priceAfter24h: p.priceAfter24h,
      priceChange: Math.round((p.priceChange || 0) * 100) / 100,
      actualDirection: p.actualDirection,
      isHoney: p.isHoney,
    })),
  }

  await fs.writeFile('./data/honey-index-final.json', JSON.stringify(output, null, 2))
  console.log('\n\n저장됨: ./data/honey-index-final.json')
}

main().catch(console.error)
