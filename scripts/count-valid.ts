/**
 * 6개 종목 기준으로 유효한 예측 개수 카운트
 */

import * as fs from 'fs/promises'

// 6개 타겟 종목만
const TARGET_ASSETS: Record<string, RegExp[]> = {
  KOSPI: [/코스피/i, /kospi/i],
  SP500: [/s&p/i, /에스앤피/i, /S&P\s*500/i, /S&P\s*8000/i],
  NASDAQ: [/나스닥/i, /nasdaq/i],
  Samsung: [/삼성전자/i, /삼전(?!자)/i],
  SKHynix: [/sk하이닉스/i, /하이닉스/i, /sk\s*하이닉스/i],
  Nvidia: [/엔비디아/i, /nvidia/i, /nvda/i],
}

// 부정 패턴
const NEGATION_PATTERNS = [
  /아닙니다/i, /아니다/i, /않습니다/i, /않는다/i, 
  /말아야/i, /하지\s*마/i, /때가\s*아니/i
]

// 강화된 Bullish (명확한 것만)
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
  { pattern: /기회/i, weight: 0.5 },
]

// 강화된 Bearish (명확한 것만)
const BEARISH_PATTERNS = [
  { pattern: /하락/i, weight: 1 },
  { pattern: /떨어/i, weight: 1 },
  { pattern: /급락/i, weight: 2 },
  { pattern: /폭락/i, weight: 2 },
  { pattern: /지금\s*팔/i, weight: 2 },
  { pattern: /팔아야/i, weight: 1.5 },
  { pattern: /팔자/i, weight: 1.5 },
  { pattern: /매도/i, weight: 1 },
  { pattern: /고점/i, weight: 0.5 },
  { pattern: /조정/i, weight: 0.5 },
  { pattern: /붕괴/i, weight: 2 },
  { pattern: /조심/i, weight: 1 },
  { pattern: /천장/i, weight: 1 },
  { pattern: /끝났/i, weight: 1 },
  { pattern: /무너/i, weight: 1.5 },
]

// 제외할 클릭베이트/중립 키워드
const EXCLUDE_IF_ONLY = ['충격', '무서운', '위기']

interface Video {
  id: string
  title: string
  publishedAt: string
}

function hasNegation(title: string): boolean {
  return NEGATION_PATTERNS.some(p => p.test(title))
}

function analyzeWithImprovedLogic(title: string) {
  // 1. 자산 감지
  const detectedAssets: string[] = []
  for (const [asset, patterns] of Object.entries(TARGET_ASSETS)) {
    if (patterns.some(p => p.test(title))) {
      detectedAssets.push(asset)
    }
  }

  // 2. 부정문 체크
  const hasNeg = hasNegation(title)

  // 3. 센티먼트 점수
  let bullishScore = 0
  let bearishScore = 0
  const bullishMatches: string[] = []
  const bearishMatches: string[] = []

  for (const { pattern, weight } of BULLISH_PATTERNS) {
    const match = title.match(pattern)
    if (match) {
      bullishMatches.push(match[0])
      bullishScore += weight
    }
  }

  for (const { pattern, weight } of BEARISH_PATTERNS) {
    const match = title.match(pattern)
    if (match) {
      bearishMatches.push(match[0])
      bearishScore += weight
    }
  }

  // 4. 부정문이면 센티먼트 반전
  // "매도할 때가 아닙니다" → bearish 키워드지만 실제 의미는 bullish
  let finalSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  
  if (hasNeg) {
    // 부정문이 있으면 센티먼트 반전
    if (bearishScore > bullishScore) {
      finalSentiment = 'bullish' // "팔 때 아니다" = 사라
      bearishScore = 0
    } else if (bullishScore > bearishScore) {
      finalSentiment = 'bearish' // "살 때 아니다" = 팔아라
      bullishScore = 0
    }
  } else {
    if (bullishScore > bearishScore && bullishScore >= 1) {
      finalSentiment = 'bullish'
    } else if (bearishScore > bullishScore && bearishScore >= 1) {
      finalSentiment = 'bearish'
    }
  }

  // 5. 클릭베이트만 있으면 중립 처리
  const onlyClickbait = (bullishMatches.length + bearishMatches.length === 1) &&
    EXCLUDE_IF_ONLY.some(k => 
      bullishMatches.concat(bearishMatches).some(m => m.includes(k))
    )
  
  if (onlyClickbait) {
    finalSentiment = 'neutral'
  }

  return {
    detectedAssets,
    hasNegation: hasNeg,
    bullishScore,
    bearishScore,
    bullishMatches,
    bearishMatches,
    sentiment: finalSentiment,
  }
}

async function main() {
  const rawData = await fs.readFile('./data/videos-2026-raw.json', 'utf-8')
  const videos: Video[] = JSON.parse(rawData)

  console.log('=== 6개 종목 기준 유효 예측 카운트 ===\n')
  console.log('종목: KOSPI, S&P500, NASDAQ, 삼성전자, SK하이닉스, 엔비디아\n')

  const validPredictions: any[] = []
  const invalidReasons: Record<string, number> = {
    'no_target_asset': 0,
    'neutral_sentiment': 0,
  }

  for (const video of videos) {
    const analysis = analyzeWithImprovedLogic(video.title)

    if (analysis.detectedAssets.length === 0) {
      invalidReasons['no_target_asset']++
      continue
    }

    if (analysis.sentiment === 'neutral') {
      invalidReasons['neutral_sentiment']++
      console.log(`[중립] ${video.title}`)
      console.log(`  자산: ${analysis.detectedAssets.join(', ')}`)
      console.log(`  강세: ${analysis.bullishMatches.join(', ') || '없음'}`)
      console.log(`  약세: ${analysis.bearishMatches.join(', ') || '없음'}`)
      console.log('')
      continue
    }

    validPredictions.push({
      ...video,
      ...analysis,
    })
  }

  console.log('\n=== 유효한 예측 ===\n')
  
  for (const pred of validPredictions) {
    const date = new Date(pred.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    const negMark = pred.hasNegation ? ' [부정문→반전]' : ''
    console.log(`[${date}] ${pred.title}`)
    console.log(`  자산: ${pred.detectedAssets.join(', ')}`)
    console.log(`  판정: ${pred.sentiment}${negMark}`)
    console.log(`  강세 키워드: ${pred.bullishMatches.join(', ') || '없음'} (${pred.bullishScore})`)
    console.log(`  약세 키워드: ${pred.bearishMatches.join(', ') || '없음'} (${pred.bearishScore})`)
    console.log('')
  }

  console.log('=== 요약 ===')
  console.log(`총 영상: ${videos.length}`)
  console.log(`타겟 자산 없음: ${invalidReasons['no_target_asset']}`)
  console.log(`중립 센티먼트: ${invalidReasons['neutral_sentiment']}`)
  console.log(`유효한 예측: ${validPredictions.length}`)
  console.log(`\n개별 자산 예측 수: ${validPredictions.reduce((acc, p) => acc + p.detectedAssets.length, 0)}`)
}

main().catch(console.error)
