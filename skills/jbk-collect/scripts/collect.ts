#!/usr/bin/env npx tsx
/**
 * 전반꿀 데이터 수집 스크립트
 * 
 * Usage:
 *   npx tsx collect.ts --start 2025-12-01 --end 2025-12-31
 */

import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { readFileSync } from 'fs'

// Load env from project directory
const PROJECT_DIR = process.cwd()
try {
  const envPath = path.join(PROJECT_DIR, '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
} catch {
  // ignore if no .env.local
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_ID = 'UCznImSIaxZR7fdLCICLdgaQ' // 전인구경제연구소

// 6개 타겟 종목
const TARGET_ASSETS: Record<string, { patterns: RegExp[], symbol: string, ticker: string }> = {
  KOSPI: { patterns: [/코스피/i, /kospi/i], symbol: 'KOSPI', ticker: '^KS11' },
  SP500: { patterns: [/s&p/i, /에스앤피/i, /S&P\s*\d+/i], symbol: 'SP500', ticker: '^GSPC' },
  NASDAQ: { patterns: [/나스닥/i, /nasdaq/i], symbol: 'NASDAQ', ticker: '^IXIC' },
  Samsung: { patterns: [/삼성전자/i, /삼전(?!자)/i], symbol: 'Samsung', ticker: '005930.KS' },
  SKHynix: { patterns: [/sk하이닉스/i, /하이닉스/i, /sk\s*하이닉스/i], symbol: 'SKHynix', ticker: '000660.KS' },
  Nvidia: { patterns: [/엔비디아/i, /nvidia/i, /nvda/i], symbol: 'Nvidia', ticker: 'NVDA' },
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
  priceAtPublish?: number
  priceAfter24h?: number
  priceChange?: number
  actualDirection?: 'up' | 'down'
  isHoney?: boolean
}

// Parse command line args
function parseArgs(): { start: Date, end: Date } {
  const args = process.argv.slice(2)
  let start: Date | null = null
  let end: Date | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      start = new Date(args[i + 1] + 'T00:00:00Z')
      i++
    } else if (args[i] === '--end' && args[i + 1]) {
      end = new Date(args[i + 1] + 'T23:59:59Z')
      i++
    }
  }

  if (!start || !end) {
    console.error('Usage: npx tsx collect.ts --start YYYY-MM-DD --end YYYY-MM-DD')
    process.exit(1)
  }

  return { start, end }
}

// Get uploads playlist ID
async function getUploadsPlaylistId(): Promise<string> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const params = new URLSearchParams({
    part: 'contentDetails',
    id: CHANNEL_ID,
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`)
  if (!response.ok) throw new Error(`YouTube API error: ${await response.text()}`)

  const data = await response.json()
  return data.items[0].contentDetails.relatedPlaylists.uploads
}

// Fetch videos in date range
async function fetchVideosInRange(start: Date, end: Date): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const playlistId = await getUploadsPlaylistId()
  console.log(`📺 Playlist: ${playlistId}`)
  console.log(`📅 기간: ${start.toISOString().split('T')[0]} ~ ${end.toISOString().split('T')[0]}\n`)

  const videos: Video[] = []
  let pageToken = ''

  while (true) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: YOUTUBE_API_KEY,
    })
    
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    if (!response.ok) throw new Error(`YouTube API error: ${await response.text()}`)

    const data = await response.json()
    
    let foundOlderVideo = false
    
    for (const item of data.items) {
      if (item.snippet.resourceId.kind !== 'youtube#video') continue
      
      const publishedAt = new Date(item.snippet.publishedAt)
      
      // Skip if before range
      if (publishedAt < start) {
        foundOlderVideo = true
        break
      }
      
      // Skip if after range
      if (publishedAt > end) continue
      
      videos.push({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        publishedAt: item.snippet.publishedAt,
      })
    }

    if (foundOlderVideo || !data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return videos
}

// Analyze title
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

  return { detectedAssets, sentiment, hasNegation: hasNeg }
}

// Get stock price via yfinance
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

async function main() {
  const { start, end } = parseArgs()
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]
  
  console.log('='.repeat(60))
  console.log(`🍯 전반꿀 데이터 수집: ${startStr} ~ ${endStr}`)
  console.log('='.repeat(60) + '\n')

  // 1. Fetch videos
  console.log('📥 영상 수집 중...')
  const videos = await fetchVideosInRange(start, end)
  console.log(`   ${videos.length}개 영상 수집 완료\n`)

  // 2. Analyze and create predictions
  const predictions: Prediction[] = []
  const now = Date.now()

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

  console.log(`📊 유효 예측: ${predictions.length}개\n`)
  console.log('💹 시장 데이터 조회 중...')

  // 3. Fetch market data
  for (const pred of predictions) {
    const publishTime = new Date(pred.publishedAt).getTime()
    const after24h = publishTime + 24 * 60 * 60 * 1000

    if (after24h > now) {
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
      process.stdout.write('.')
    }
  }
  console.log(' 완료\n')

  // 4. Calculate stats
  const withData = predictions.filter(p => p.isHoney !== undefined)
  const honeyCount = withData.filter(p => p.isHoney).length
  const honeyIndex = withData.length > 0 ? (honeyCount / withData.length) * 100 : 0

  const assetStats: Record<string, { total: number, honey: number }> = {}
  for (const pred of withData) {
    if (!assetStats[pred.asset]) {
      assetStats[pred.asset] = { total: 0, honey: 0 }
    }
    assetStats[pred.asset].total++
    if (pred.isHoney) assetStats[pred.asset].honey++
  }

  // 5. Output
  console.log('='.repeat(60))
  console.log(`🍯 전반꿀 지수: ${honeyIndex.toFixed(1)}% (${honeyCount}/${withData.length})`)
  console.log('='.repeat(60))
  
  console.log('\n📈 종목별:')
  for (const [asset, stats] of Object.entries(assetStats)) {
    const pct = stats.total > 0 ? (stats.honey / stats.total) * 100 : 0
    console.log(`   ${asset}: ${pct.toFixed(1)}% (${stats.honey}/${stats.total})`)
  }

  console.log('\n📋 상세:')
  for (const pred of withData) {
    const date = new Date(pred.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    const emoji = pred.isHoney ? '🍯' : '❌'
    const negMark = pred.hasNegation ? ' [반전]' : ''
    const changeStr = `${pred.priceChange! >= 0 ? '+' : ''}${pred.priceChange!.toFixed(2)}%`
    
    console.log(`${emoji} [${date}] ${pred.asset}: ${pred.predictedDirection}${negMark} → ${pred.actualDirection} (${changeStr})`)
  }

  // 6. Save
  const output = {
    collectedAt: new Date().toISOString(),
    period: { start: startStr, end: endStr },
    methodology: {
      assets: Object.keys(TARGET_ASSETS),
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
    },
    assetStats: Object.entries(assetStats).map(([asset, s]) => ({
      asset,
      honeyIndex: Math.round((s.total > 0 ? (s.honey / s.total) * 100 : 0) * 10) / 10,
      total: s.total,
      honey: s.honey,
    })),
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

  await fs.mkdir('./data', { recursive: true })
  const filename = `./data/honey-index-${startStr}-to-${endStr}.json`
  await fs.writeFile(filename, JSON.stringify(output, null, 2))
  console.log(`\n💾 저장: ${filename}`)
}

main().catch(console.error)
