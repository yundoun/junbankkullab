#!/usr/bin/env npx tsx
/**
 * JSON 데이터를 Supabase 새 스키마로 마이그레이션
 * 
 * 사용법: npx tsx scripts/migrate-to-supabase.ts
 * 
 * 역할:
 * - data/{year}/{month}/*.json 읽기
 * - videos, analyses, market_data 테이블에 삽입
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DATA_DIR = path.join(__dirname, '../data')

// ============================================================
// 타입 정의
// ============================================================

interface AnalyzedItem {
  videoId: string
  title: string
  publishedAt: string
  analysis: {
    method: string
    model: string
    timestamp: string
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
  marketData: {
    asset: string
    ticker: string
    closePrice: number
    previousClose: number | null
    priceChange: number
    direction: 'up' | 'down' | 'flat'
    tradingDate: string
  }
  judgment: {
    predictedDirection: string
    actualDirection: string
    isHoney: boolean
    reasoning: string
  }
}

interface Video {
  id: string
  title: string
  publishedAt: string
  thumbnail?: string
}

interface UnanalyzedItem {
  videoId: string
  title: string
  publishedAt: string
  reason: string
}

interface ExcludedItem {
  videoId: string
  title: string
  publishedAt: string
  asset: string
  reason: string
}

// ============================================================
// 마이그레이션 함수
// ============================================================

async function migrateVideos(videos: Video[]): Promise<number> {
  let count = 0
  
  for (const video of videos) {
    const { error } = await supabase
      .from('videos')
      .upsert({
        id: video.id,
        title: video.title,
        thumbnail_url: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        published_at: video.publishedAt,
        status: 'unanalyzed',
      }, { onConflict: 'id' })
    
    if (error) {
      console.error(`  ❌ video ${video.id}: ${error.message}`)
    } else {
      count++
    }
  }
  
  return count
}

async function migrateAnalyzedItems(items: AnalyzedItem[]): Promise<{ videos: number; analyses: number; marketData: number }> {
  const stats = { videos: 0, analyses: 0, marketData: 0 }
  
  for (const item of items) {
    // 1. videos 테이블 업데이트
    const { error: videoError } = await supabase
      .from('videos')
      .upsert({
        id: item.videoId,
        title: item.title,
        thumbnail_url: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        published_at: item.publishedAt,
        status: 'analyzed',
      }, { onConflict: 'id' })
    
    if (videoError) {
      console.error(`  ❌ video ${item.videoId}: ${videoError.message}`)
      continue
    }
    stats.videos++
    
    // 해당 종목 찾기
    const detectedAsset = item.analysis.detectedAssets.find(
      a => a.asset === item.marketData.asset
    )
    
    // 2. analyses 테이블
    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .upsert({
        video_id: item.videoId,
        asset: item.marketData.asset,
        ticker: item.marketData.ticker,
        matched_text: detectedAsset?.matchedText || null,
        confidence: detectedAsset?.confidence || null,
        asset_reasoning: detectedAsset?.reasoning || null,
        tone: item.analysis.toneAnalysis.tone,
        tone_keywords: item.analysis.toneAnalysis.keywords || [],
        tone_reasoning: item.analysis.toneAnalysis.reasoning || null,
        llm_model: item.analysis.model,
        analyzed_at: item.analysis.timestamp || new Date().toISOString(),
      }, { onConflict: 'video_id,asset' })
      .select('id')
      .single()
    
    if (analysisError) {
      console.error(`  ❌ analysis ${item.videoId}/${item.marketData.asset}: ${analysisError.message}`)
      continue
    }
    stats.analyses++
    
    // 3. market_data 테이블
    const { error: marketError } = await supabase
      .from('market_data')
      .upsert({
        analysis_id: analysisData.id,
        trading_date: item.marketData.tradingDate,
        previous_close: item.marketData.previousClose,
        close_price: item.marketData.closePrice,
        price_change: item.marketData.priceChange,
        direction: item.marketData.direction,
        predicted_direction: item.judgment.predictedDirection,
        is_honey: item.judgment.isHoney,
        judgment_reasoning: item.judgment.reasoning,
      }, { onConflict: 'analysis_id' })
    
    if (marketError) {
      console.error(`  ❌ market_data ${item.videoId}/${item.marketData.asset}: ${marketError.message}`)
    } else {
      stats.marketData++
    }
  }
  
  return stats
}

async function migrateUnanalyzed(items: UnanalyzedItem[]): Promise<number> {
  let count = 0
  
  for (const item of items) {
    const { error } = await supabase
      .from('videos')
      .upsert({
        id: item.videoId,
        title: item.title,
        thumbnail_url: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        published_at: item.publishedAt,
        status: 'unanalyzed',
        exclude_reason: item.reason,
      }, { onConflict: 'id' })
    
    if (!error) count++
  }
  
  return count
}

async function migrateExcluded(items: ExcludedItem[]): Promise<number> {
  let count = 0
  
  for (const item of items) {
    const { error } = await supabase
      .from('videos')
      .upsert({
        id: item.videoId,
        title: item.title,
        thumbnail_url: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        published_at: item.publishedAt,
        status: 'excluded',
        exclude_reason: `${item.asset}: ${item.reason}`,
      }, { onConflict: 'id' })
    
    if (!error) count++
  }
  
  return count
}

async function processMonth(year: string, month: string) {
  const monthDir = path.join(DATA_DIR, year, month)
  const stats = {
    videos: 0,
    analyzed: { videos: 0, analyses: 0, marketData: 0 },
    unanalyzed: 0,
    excluded: 0,
  }
  
  // videos.json
  const videosPath = path.join(monthDir, 'videos.json')
  if (fs.existsSync(videosPath)) {
    const videos: Video[] = JSON.parse(fs.readFileSync(videosPath, 'utf-8'))
    stats.videos = await migrateVideos(videos)
  }
  
  // analyzed.json
  const analyzedPath = path.join(monthDir, 'analyzed.json')
  if (fs.existsSync(analyzedPath)) {
    const items: AnalyzedItem[] = JSON.parse(fs.readFileSync(analyzedPath, 'utf-8'))
    stats.analyzed = await migrateAnalyzedItems(items)
  }
  
  // unanalyzed.json
  const unanalyzedPath = path.join(monthDir, 'unanalyzed.json')
  if (fs.existsSync(unanalyzedPath)) {
    const items: UnanalyzedItem[] = JSON.parse(fs.readFileSync(unanalyzedPath, 'utf-8'))
    stats.unanalyzed = await migrateUnanalyzed(items)
  }
  
  // excluded.json
  const excludedPath = path.join(monthDir, 'excluded.json')
  if (fs.existsSync(excludedPath)) {
    const items: ExcludedItem[] = JSON.parse(fs.readFileSync(excludedPath, 'utf-8'))
    stats.excluded = await migrateExcluded(items)
  }
  
  return stats
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('🔄 Supabase 마이그레이션 시작...')
  console.log(`   URL: ${supabaseUrl}\n`)
  
  const totals = {
    videos: 0,
    analyses: 0,
    marketData: 0,
  }
  
  // 모든 연/월 디렉토리 탐색
  const years = fs.readdirSync(DATA_DIR).filter(d => /^\d{4}$/.test(d)).sort()
  
  for (const year of years) {
    const yearPath = path.join(DATA_DIR, year)
    const months = fs.readdirSync(yearPath).filter(d => /^\d{2}$/.test(d)).sort()
    
    for (const month of months) {
      console.log(`📅 ${year}/${month} 처리 중...`)
      
      const stats = await processMonth(year, month)
      
      totals.videos += stats.analyzed.videos
      totals.analyses += stats.analyzed.analyses
      totals.marketData += stats.analyzed.marketData
      
      console.log(`   videos: ${stats.videos}, analyzed: ${stats.analyzed.analyses}, market_data: ${stats.analyzed.marketData}`)
    }
  }
  
  console.log('\n==================================================')
  console.log('✅ 마이그레이션 완료')
  console.log('==================================================')
  console.log(`videos 테이블: ${totals.videos}개`)
  console.log(`analyses 테이블: ${totals.analyses}개`)
  console.log(`market_data 테이블: ${totals.marketData}개`)
  console.log('==================================================\n')
}

main().catch(console.error)
