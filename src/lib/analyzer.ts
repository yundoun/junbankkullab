// Asset detection patterns
const ASSET_PATTERNS: Record<string, RegExp[]> = {
  bitcoin: [/비트코인/i, /btc/i, /코인/i, /암호화폐/i, /가상화폐/i, /크립토/i],
  ethereum: [/이더리움/i, /eth/i],
  kospi: [/코스피/i, /kospi/i, /한국\s*(주식|증시)/i],
  nasdaq: [/나스닥/i, /nasdaq/i, /미국\s*(주식|증시)/i, /미장/i],
  sp500: [/s&p/i, /에스앤피/i, /S&P\s*500/i],
  tesla: [/테슬라/i, /tesla/i, /tsla/i],
  samsung: [/삼성전자/i, /삼전/i, /samsung/i],
  nvidia: [/엔비디아/i, /nvidia/i, /nvda/i],
  apple: [/애플/i, /apple/i, /aapl/i],
  gold: [/금값/i, /금가격/i, /골드/i],
  dollar: [/달러/i, /환율/i, /usd/i],
}

// Bullish keywords (상승 예측)
const BULLISH_PATTERNS = [
  /상승/i, /오른다/i, /올라/i, /급등/i, /폭등/i,
  /사야/i, /매수/i, /기회/i, /저점/i, /반등/i,
  /회복/i, /돌파/i, /신고가/i, /불장/i, /호재/i,
  /가즈아/i, /날아/i, /떡상/i, /대세/i,
]

// Bearish keywords (하락 예측)
const BEARISH_PATTERNS = [
  /하락/i, /떨어/i, /내려/i, /급락/i, /폭락/i,
  /팔아/i, /매도/i, /위험/i, /고점/i, /조정/i,
  /붕괴/i, /위기/i, /망/i, /곤두박질/i, /악재/i,
  /버블/i, /거품/i, /끝/i, /빠진다/i, /조심/i,
  /무너/i, /반토막/i, /대폭락/i, /침체/i,
]

export interface AnalysisResult {
  assets: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  bullishScore: number
  bearishScore: number
}

export function analyzeTitle(title: string): AnalysisResult {
  // Detect assets
  const assets: string[] = []
  for (const [asset, patterns] of Object.entries(ASSET_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(title))) {
      assets.push(asset)
    }
  }

  // Calculate sentiment scores
  let bullishScore = 0
  let bearishScore = 0

  for (const pattern of BULLISH_PATTERNS) {
    if (pattern.test(title)) bullishScore++
  }

  for (const pattern of BEARISH_PATTERNS) {
    if (pattern.test(title)) bearishScore++
  }

  // Determine sentiment
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const totalScore = bullishScore + bearishScore
  
  if (totalScore > 0) {
    if (bullishScore > bearishScore) {
      sentiment = 'bullish'
    } else if (bearishScore > bullishScore) {
      sentiment = 'bearish'
    }
  }

  // Confidence based on score difference
  const confidence = totalScore > 0 
    ? Math.abs(bullishScore - bearishScore) / totalScore 
    : 0

  return {
    assets,
    sentiment,
    confidence,
    bullishScore,
    bearishScore,
  }
}

// Check if prediction was "honey" (inverse = correct)
export function isHoney(
  predictedDirection: 'bullish' | 'bearish' | 'neutral',
  actualDirection: 'up' | 'down'
): boolean | null {
  if (predictedDirection === 'neutral') return null
  
  // 전반꿀 = 반대로 움직임
  if (predictedDirection === 'bullish' && actualDirection === 'down') return true
  if (predictedDirection === 'bearish' && actualDirection === 'up') return true
  
  return false
}
