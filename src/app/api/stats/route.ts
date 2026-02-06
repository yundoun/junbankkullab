import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// === 타입 정의 ===
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
  priceChange?: number | null
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

interface Video {
  id: string
  title: string
  thumbnail?: string
  publishedAt: string
}

// === 종목 패턴 ===
const ASSET_PATTERNS: Record<string, RegExp[]> = {
  KOSPI: [/코스피/i, /kospi/i, /국장/i],
  SP500: [/S&?P\s*500/i, /에스앤피/i],
  NASDAQ: [/나스닥/i, /nasdaq/i, /미장/i],
  Samsung: [/삼성전자/i, /삼전/i],
  SKHynix: [/하이닉스/i, /sk하이닉스/i],
  Nvidia: [/엔비디아/i, /nvidia/i],
  Google: [/구글/i, /google/i, /googl/i, /알파벳/i],
  Tesla: [/테슬라/i, /tesla/i],
  Bitcoin: [/비트코인/i, /bitcoin/i, /btc/i, /코인/i],
  Shipbuilding: [/조선주/i, /조선업/i, /조선.*주/i, /한국조선/i],
}

// === 톤 분석 키워드 ===
const POSITIVE_KEYWORDS = [
  '상승', '급등', '폭등', '오른다', '올라', '반등', '회복', '호재',
  '매수', '사야', '담아', '저점', '기회', '대박', '신고가', '돌파',
  '불장', '상승장', '강세', '최고', '간다', '오를',
]

const NEGATIVE_KEYWORDS = [
  '하락', '급락', '폭락', '떨어', '내린다', '내려', '붕괴', '위기', '악재',
  '매도', '팔아', '빠져', '고점', '위험', '경고', '신저가', '무너',
  '하락장', '약세', '최악', '충격', '끝났다', '망한다',
]

const NEGATION_WORDS = ['아니', '없', '안 ', '못 ', '말라', '마라', '마세요']

// === 유틸 함수 ===
function detectAssets(title: string): string[] {
  const assets: string[] = []
  for (const [asset, patterns] of Object.entries(ASSET_PATTERNS)) {
    if (patterns.some(p => p.test(title))) {
      assets.push(asset)
    }
  }
  return assets
}

function analyzeTone(title: string): 'positive' | 'negative' | 'neutral' {
  let positiveScore = 0
  let negativeScore = 0
  
  const hasNegation = NEGATION_WORDS.some(w => title.includes(w))
  
  for (const keyword of POSITIVE_KEYWORDS) {
    if (title.includes(keyword)) positiveScore++
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (title.includes(keyword)) negativeScore++
  }
  
  if (hasNegation) {
    [positiveScore, negativeScore] = [negativeScore, positiveScore]
  }
  
  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

async function getLatestVideos(): Promise<Video[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  const videos: Video[] = []
  
  // 현재 월과 이전 월 데이터 로드
  for (const m of [month, month - 1]) {
    const y = m <= 0 ? year - 1 : year
    const mm = m <= 0 ? 12 : m
    const videosPath = path.join(process.cwd(), 'data', String(y), String(mm).padStart(2, '0'), 'videos.json')
    
    try {
      const data = await fs.readFile(videosPath, 'utf-8')
      videos.push(...JSON.parse(data))
    } catch {
      // 파일 없으면 무시
    }
  }
  
  return videos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

async function getManualLabels(): Promise<Record<string, 'positive' | 'negative' | 'skip'>> {
  try {
    const labelsPath = path.join(process.cwd(), 'data', 'review', 'manual-labels.json')
    const data = await fs.readFile(labelsPath, 'utf-8')
    const raw = JSON.parse(data)
    
    const labels: Record<string, 'positive' | 'negative' | 'skip'> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (value === 'P' || value === 'positive') labels[key] = 'positive'
      else if (value === 'N' || value === 'negative') labels[key] = 'negative'
      else if (value === 'S' || value === 'skip') labels[key] = 'skip'
    }
    return labels
  } catch {
    return {}
  }
}

interface VotableItem {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  expiresAt: string // 투표 마감 시간 (24시간 후)
}

async function getVotableItems(): Promise<VotableItem[]> {
  const now = Date.now()
  const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000 // 24시간
  
  const videos = await getLatestVideos()
  const manualLabels = await getManualLabels()
  
  const votableItems: VotableItem[] = []
  
  for (const video of videos) {
    const publishedTime = new Date(video.publishedAt).getTime()
    const expiresAt = publishedTime + VOTE_WINDOW_MS
    
    // 24시간 지났으면 스킵
    if (now > expiresAt) continue
    
    // 종목 언급 확인
    const assets = detectAssets(video.title)
    if (assets.length === 0) continue
    
    for (const asset of assets) {
      const labelKey = `${video.id}_${asset}`
      const manualLabel = manualLabels[labelKey]
      
      // 스킵으로 레이블된 것 제외
      if (manualLabel === 'skip') continue
      
      // 톤 결정: 수동 레이블 우선, 없으면 자동 분석
      let tone: 'positive' | 'negative' | 'neutral'
      if (manualLabel === 'positive' || manualLabel === 'negative') {
        tone = manualLabel
      } else {
        tone = analyzeTone(video.title)
      }
      
      // 톤이 명확해야 투표 가능
      if (tone === 'neutral') continue
      
      votableItems.push({
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        publishedAt: video.publishedAt,
        asset,
        predictedDirection: tone === 'positive' ? 'bullish' : 'bearish',
        expiresAt: new Date(expiresAt).toISOString(),
      })
    }
  }
  
  return votableItems
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
      priceChange: m.priceChange ?? undefined,
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
      pendingReviews = neutralMentions
        .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .map((m: any) => ({
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

    // 🗳️ 투표 가능 항목 (24시간 이내 + 톤 명확)
    const votableItems = await getVotableItems()

    // 하위 호환성을 위한 recentPredictions
    const recentPredictions = sortedMentions.slice(0, 20).map(mapMention)

    // 수동 레이블에서 skip 개수 계산 (제외 항목)
    const manualLabels = await getManualLabels()
    const excludedCount = Object.values(manualLabels).filter(v => v === 'skip').length

    // 톤 미확정 수 = 전체 멘션 - 분석 가능 멘션
    const unanalyzedCount = parsed.stats.totalMentions - parsed.stats.analyzableMentions

    return NextResponse.json({
      // 핵심 지표
      overallHoneyIndex: parsed.stats.honeyIndex,
      totalPredictions: parsed.stats.validMentions,
      honeyCount: parsed.stats.honeyCount,
      
      // 메타 정보
      totalVideos: parsed.stats.totalVideos,
      totalMentions: parsed.stats.totalMentions,
      pendingReviewCount: pendingReviews.length,

      // 🆕 분석 퍼널
      funnel: {
        totalVideos: parsed.stats.totalVideos,           // 전체 영상 수
        withMentions: parsed.stats.totalMentions,        // 종목 언급 수
        withTone: parsed.stats.analyzableMentions,       // 톤 분석 완료 수
        withMarketData: parsed.stats.validMentions,      // 시장 데이터 확인 수
        honeyHits: parsed.stats.honeyCount,              // 역지표 적중 수
      },

      // 🆕 제외/미분석
      unanalyzedCount,    // 톤 미확정 수
      excludedCount,      // 제외 항목 수 (알트코인 등)
      
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
      
      // 🗳️ 투표 가능 항목
      votableItems,
      
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
      pendingReviewCount: 0,
      assetStats: [],
      votableItems: [],
      honeyHits: [],
      jigHits: [],
      pendingReviews: [],
      recentPredictions: [],
      updatedAt: null,
    })
  }
}
