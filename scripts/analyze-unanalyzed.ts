#!/usr/bin/env npx tsx
/**
 * 미분석 영상 처리 스크립트
 * 
 * Supabase에서 status='unanalyzed' 영상을 가져와서 LLM 분석 + 시장 데이터 조회
 * 
 * 사용법: npx tsx scripts/analyze-unanalyzed.ts --limit 100
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import OpenAI from 'openai'

// .env.local 로드
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

// CLI 인자 파싱
const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) || 100 : 100

// 종목 패턴
const ASSET_PATTERNS: Record<string, { patterns: RegExp[], ticker: string }> = {
  'KOSPI': { patterns: [/코스피/i, /kospi/i], ticker: '^KS11' },
  'NASDAQ': { patterns: [/나스닥/i, /nasdaq/i, /미장/i], ticker: '^IXIC' },
  'SP500': { patterns: [/s&p\s*500/i, /에스앤피/i], ticker: '^GSPC' },
  'Samsung': { patterns: [/삼성전자/i, /삼전/i], ticker: '005930.KS' },
  'SKHynix': { patterns: [/sk\s*하이닉스/i, /하이닉스/i], ticker: '000660.KS' },
  'Tesla': { patterns: [/테슬라/i, /tesla/i], ticker: 'TSLA' },
  'Nvidia': { patterns: [/엔비디아/i, /nvidia/i], ticker: 'NVDA' },
  'Bitcoin': { patterns: [/비트코인/i, /btc/i, /코인/i], ticker: 'BTC-USD' },
  'Google': { patterns: [/구글/i, /google/i, /알파벳/i], ticker: 'GOOGL' },
  'Shipbuilding': { patterns: [/조선/i, /hd현대/i, /한화오션/i, /삼성중공업/i], ticker: '009540.KS' },
  'Battery': { patterns: [/2차전지/i, /배터리/i, /lg에너지/i, /에코프로/i], ticker: '373220.KS' },
  'Bio': { patterns: [/바이오/i, /셀트리온/i, /삼성바이오/i], ticker: '068270.KS' },
  'Nuclear': { patterns: [/원전/i, /원자력/i, /두산에너빌리티/i], ticker: '034020.KS' },
  'Defense': { patterns: [/방산/i, /한화에어로/i, /LIG넥스원/i], ticker: '012450.KS' },
  'Auto': { patterns: [/현대차/i, /기아/i, /자동차/i], ticker: '005380.KS' },
}

// 알트코인 체크
function isAltcoin(asset: string): boolean {
  const altcoins = ['Ethereum', 'Solana', 'Ripple', 'Dogecoin', 'XRP', 'SOL', 'ETH', '이더리움', '솔라나', '리플', '도지']
  return altcoins.some(a => asset.toLowerCase().includes(a.toLowerCase()))
}

// LLM 분석
async function analyzeWithLLM(title: string): Promise<{
  assets: Array<{ asset: string; ticker: string; confidence: number; reasoning: string }>
  tone: 'positive' | 'negative' | 'neutral'
  toneReasoning: string
} | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 금융 영상 제목을 분석하는 전문가입니다.
제목에서 언급된 종목과 해당 종목에 대한 톤(긍정/부정/중립)을 분석하세요.

응답은 반드시 JSON 형식으로:
{
  "assets": [
    {"asset": "종목명", "confidence": 0.9, "reasoning": "이유"}
  ],
  "tone": "positive" | "negative" | "neutral",
  "toneReasoning": "톤 판단 이유"
}

종목명은 다음 중 하나: KOSPI, NASDAQ, SP500, Samsung, SKHynix, Tesla, Nvidia, Bitcoin, Google, Shipbuilding, Battery, Bio, Nuclear, Defense, Auto

톤 판단 기준:
- positive: 상승, 매수, 기회, 좋은 전망
- negative: 하락, 위험, 매도, 조심
- neutral: 판단 불가, 혼재, 객관적 분석`
        },
        { role: 'user', content: `제목: "${title}"` }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    
    // ticker 매핑
    const assets = (parsed.assets || []).map((a: any) => ({
      ...a,
      ticker: ASSET_PATTERNS[a.asset]?.ticker || null
    })).filter((a: any) => a.ticker)

    return {
      assets,
      tone: parsed.tone || 'neutral',
      toneReasoning: parsed.toneReasoning || ''
    }
  } catch (error) {
    console.error('LLM 분석 오류:', error)
    return null
  }
}

// 시장 데이터 조회
function getMarketData(ticker: string, date: string): {
  closePrice: number
  previousClose: number
  priceChange: number
  direction: 'up' | 'down' | 'flat'
  tradingDate: string
} | null {
  try {
    const projectDir = path.join(__dirname, '..')
    const pythonScript = path.join(__dirname, 'market_data.py')
    
    const result = execSync(
      `cd "${projectDir}" && ./venv/bin/python "${pythonScript}" close ${ticker} ${date}`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    )

    const data = JSON.parse(result.trim())
    if (data.error) return null

    const priceChange = data.previousClose
      ? Math.round(((data.closePrice - data.previousClose) / data.previousClose) * 10000) / 100
      : 0

    return {
      closePrice: data.closePrice,
      previousClose: data.previousClose,
      priceChange,
      direction: priceChange > 0.1 ? 'up' : priceChange < -0.1 ? 'down' : 'flat',
      tradingDate: data.tradingDay || data.date
    }
  } catch (error) {
    return null
  }
}

// 메인 함수
async function main() {
  console.log(`🔄 미분석 영상 처리 시작 (최대 ${LIMIT}개)...\n`)

  // 1. 미분석 영상 가져오기
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('status', 'unanalyzed')
    .order('published_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error('❌ 영상 조회 실패:', error.message)
    process.exit(1)
  }

  console.log(`📹 미분석 영상 ${videos?.length || 0}개 발견\n`)

  let analyzed = 0
  let excluded = 0
  let failed = 0

  for (const video of videos || []) {
    console.log(`\n🎬 처리 중: ${video.title.substring(0, 50)}...`)

    // 2. LLM 분석
    const analysis = await analyzeWithLLM(video.title)

    if (!analysis || analysis.assets.length === 0) {
      console.log('   ⏭️ 종목 감지 안됨 - excluded')
      await supabase
        .from('videos')
        .update({ status: 'excluded', exclude_reason: 'no_assets' })
        .eq('id', video.id)
      excluded++
      continue
    }

    if (analysis.tone === 'neutral') {
      console.log('   ⏭️ 톤 중립 - 유지')
      // neutral은 unanalyzed로 유지 (추후 재분석 가능)
      continue
    }

    // 3. 각 종목별 시장 데이터 조회
    let hasValidData = false

    for (const asset of analysis.assets) {
      if (isAltcoin(asset.asset)) {
        console.log(`   ⏭️ ${asset.asset} - 알트코인 제외`)
        continue
      }

      const publishedDate = video.published_at.split('T')[0]
      const marketData = getMarketData(asset.ticker, publishedDate)

      if (!marketData) {
        console.log(`   ⚠️ ${asset.asset} - 시장 데이터 없음`)
        continue
      }

      // 4. analyses 테이블에 저장
      const predictedDirection = analysis.tone === 'positive' ? 'bullish' : 'bearish'
      const actualDirection = marketData.direction === 'up' ? 'bullish' : marketData.direction === 'down' ? 'bearish' : 'flat'
      const isHoney = (predictedDirection === 'bullish' && actualDirection === 'bearish') ||
                      (predictedDirection === 'bearish' && actualDirection === 'bullish')

      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .upsert({
          video_id: video.id,
          asset: asset.asset,
          ticker: asset.ticker,
          confidence: asset.confidence,
          asset_reasoning: asset.reasoning,
          tone: analysis.tone,
          tone_reasoning: analysis.toneReasoning,
          llm_model: 'gpt-4o-mini',
          analyzed_at: new Date().toISOString()
        }, { onConflict: 'video_id,asset' })
        .select()
        .single()

      if (analysisError) {
        console.error(`   ❌ analyses 저장 실패: ${analysisError.message}`)
        continue
      }

      // 5. market_data 테이블에 저장
      const { error: marketError } = await supabase
        .from('market_data')
        .upsert({
          analysis_id: analysisData.id,
          trading_date: marketData.tradingDate,
          previous_close: marketData.previousClose,
          close_price: marketData.closePrice,
          price_change: marketData.priceChange,
          direction: marketData.direction,
          predicted_direction: predictedDirection,
          is_honey: isHoney,
          judgment_reasoning: `${analysis.tone === 'positive' ? '긍정' : '부정'} 예측 → 실제 ${marketData.direction} → ${isHoney ? '역지표 적중' : '예측대로'}`
        }, { onConflict: 'analysis_id' })

      if (marketError) {
        console.error(`   ❌ market_data 저장 실패: ${marketError.message}`)
        continue
      }

      console.log(`   ✅ ${asset.asset}: ${predictedDirection} → ${actualDirection} (${isHoney ? '🍯' : '📈'})`)
      hasValidData = true
    }

    // 6. 영상 상태 업데이트
    if (hasValidData) {
      await supabase
        .from('videos')
        .update({ status: 'analyzed' })
        .eq('id', video.id)
      analyzed++
    } else {
      failed++
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ 처리 완료`)
  console.log(`   분석 완료: ${analyzed}개`)
  console.log(`   제외됨: ${excluded}개`)
  console.log(`   실패: ${failed}개`)
  console.log(`${'='.repeat(50)}`)
}

main().catch(console.error)
