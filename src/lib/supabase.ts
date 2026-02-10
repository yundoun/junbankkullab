import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// 클라이언트용 (읽기 전용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 익명 세션 ID 생성 (투표용)
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  
  const storageKey = 'jbk_session_id'
  let sessionId = localStorage.getItem(storageKey)
  
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(storageKey, sessionId)
  }
  
  return sessionId
}

// 서버용 (쓰기 가능) - Service Role Key 필요
export function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY is not set')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

// 타입 정의
export interface VideoRow {
  id: string
  title: string
  thumbnail_url: string | null
  published_at: string
  status: 'analyzed' | 'unanalyzed' | 'excluded'
  exclude_reason: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisRow {
  id: string
  video_id: string
  asset: string
  ticker: string | null
  matched_text: string | null
  confidence: number | null
  asset_reasoning: string | null
  tone: 'positive' | 'negative' | 'neutral'
  tone_keywords: string[] | null
  tone_reasoning: string | null
  llm_model: string | null
  analyzed_at: string
}

export interface MarketDataRow {
  id: string
  analysis_id: string
  trading_date: string
  previous_close: number | null
  close_price: number | null
  price_change: number | null
  direction: 'up' | 'down' | null
  predicted_direction: 'bullish' | 'bearish' | null
  is_honey: boolean | null
  judgment_reasoning: string | null
  fetched_at: string
}

// 조인된 분석 결과 타입
export interface AnalysisWithMarketData extends AnalysisRow {
  videos: VideoRow
  market_data: MarketDataRow[]
}
