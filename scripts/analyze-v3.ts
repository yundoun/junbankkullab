#!/usr/bin/env npx tsx
/**
 * 전반꿀 연구소 분석 스크립트 v3 (LLM 기반)
 * 
 * 개선사항 (v2 → v3):
 * - LLM 기반 종목/섹터 추출 (GPT-4o-mini)
 * - LLM 기반 톤 분석
 * - 상세 분석 근거 저장 (detail 페이지용)
 * - 캐싱으로 중복 API 호출 방지
 * 
 * 사용처:
 * - GitHub Actions 자동 수집
 * - 수동 분석: npx tsx scripts/analyze-v3.ts
 * 
 * 출력:
 * - data/{YYYY}/{MM}/analyzed.json: 분석 완료 (상세 정보 포함)
 * - data/{YYYY}/{MM}/unanalyzed.json: LLM도 판단 불가
 * - data/{YYYY}/{MM}/excluded.json: 제외 항목 (알트코인 등)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { analyzeWithCache, LLMAnalysisResult, SECTOR_TICKER_MAP } from './llm-classifier';

const DATA_DIR = path.join(__dirname, '../data');

// ============================================================
// 타입 정의
// ============================================================

interface Video {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
}

/**
 * 분석 완료 항목 (상세 페이지용 전체 정보)
 */
interface AnalyzedItem {
  // 기본 정보
  videoId: string;
  title: string;
  publishedAt: string;
  
  // LLM 분석 결과
  analysis: LLMAnalysisResult;
  
  // 시장 데이터 (종목별)
  marketData: {
    asset: string;
    ticker: string;
    closePrice: number;
    previousClose: number | null;
    priceChange: number;
    direction: 'up' | 'down' | 'flat';
    tradingDate: string;
  };
  
  // 최종 판단
  judgment: {
    predictedDirection: 'bullish' | 'bearish';
    actualDirection: 'bullish' | 'bearish' | 'flat';
    isHoney: boolean;
    reasoning: string;
  };
}

/**
 * 미분석 항목
 */
interface UnanalyzedItem {
  videoId: string;
  title: string;
  publishedAt: string;
  reason: string;
  analysis?: LLMAnalysisResult;
}

/**
 * 제외 항목
 */
interface ExcludedItem {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  reason: string;
}

// ============================================================
// 알트코인 패턴 (제외 대상)
// ============================================================

const ALTCOIN_ASSETS = ['Ethereum']; // Bitcoin은 분석 대상

function isAltcoin(asset: string): boolean {
  return ALTCOIN_ASSETS.includes(asset);
}

// ============================================================
// 시장 데이터 조회
// ============================================================

function getClosePrice(asset: string, publishedAt: string): {
  direction: 'up' | 'down' | 'flat' | 'no_data';
  closePrice: number;
  previousClose: number | null;
  priceChange: number;
  closePriceDate: string;
} {
  try {
    // 발행일에서 날짜 추출
    const date = publishedAt.split('T')[0];
    
    // Python 스크립트 호출 (venv 사용)
    const projectDir = path.join(__dirname, '..');
    const pythonCmd = fs.existsSync(path.join(projectDir, 'venv'))
      ? `source venv/bin/activate && python3 scripts/market_data.py close ${asset} ${date}`
      : `python3 scripts/market_data.py close ${asset} ${date}`;
    
    const result = execSync(
      `cd "${projectDir}" && ${pythonCmd}`,
      { encoding: 'utf-8', timeout: 30000, shell: '/bin/bash' }
    );
    
    const data = JSON.parse(result.trim());
    
    if (data.error) {
      return { direction: 'no_data', closePrice: 0, previousClose: null, priceChange: 0, closePriceDate: '' };
    }
    
    const priceChange = data.previousClose 
      ? ((data.closePrice - data.previousClose) / data.previousClose) * 100 
      : 0;
    
    return {
      direction: data.direction || 'flat',
      closePrice: data.closePrice,
      previousClose: data.previousClose,
      priceChange,
      closePriceDate: data.date || date,
    };
  } catch (e) {
    console.error(`  시장 데이터 조회 실패: ${asset}`, e);
    return { direction: 'no_data', closePrice: 0, previousClose: null, priceChange: 0, closePriceDate: '' };
  }
}

// ============================================================
// 월별 데이터 처리
// ============================================================

interface MonthlyResult {
  analyzed: AnalyzedItem[];
  unanalyzed: UnanalyzedItem[];
  excluded: ExcludedItem[];
}

async function processMonth(year: number, month: number): Promise<MonthlyResult> {
  const monthStr = String(month).padStart(2, '0');
  const monthDir = path.join(DATA_DIR, String(year), monthStr);
  const videosPath = path.join(monthDir, 'videos.json');
  
  const result: MonthlyResult = {
    analyzed: [],
    unanalyzed: [],
    excluded: [],
  };
  
  if (!fs.existsSync(videosPath)) {
    return result;
  }
  
  const videos: Video[] = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));
  
  for (const video of videos) {
    // LLM 분석 (캐시 활용)
    const analysis = await analyzeWithCache(video.id, video.title);
    
    // 종목이 없으면 스킵
    if (analysis.detectedAssets.length === 0) {
      continue;
    }
    
    // 톤이 neutral이면 미분석
    if (analysis.toneAnalysis.tone === 'neutral') {
      result.unanalyzed.push({
        videoId: video.id,
        title: video.title,
        publishedAt: video.publishedAt,
        reason: 'neutral_tone',
        analysis,
      });
      continue;
    }
    
    // 각 종목별로 처리
    for (const detectedAsset of analysis.detectedAssets) {
      const asset = detectedAsset.asset;
      
      // 알트코인 제외
      if (isAltcoin(asset)) {
        result.excluded.push({
          videoId: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          asset,
          reason: 'altcoin',
        });
        continue;
      }
      
      // 매핑 확인
      const mapping = SECTOR_TICKER_MAP[asset];
      if (!mapping) {
        result.unanalyzed.push({
          videoId: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          reason: `unknown_asset: ${asset}`,
          analysis,
        });
        continue;
      }
      
      // 시장 데이터 조회
      const marketData = getClosePrice(asset, video.publishedAt);
      
      if (marketData.direction === 'no_data') {
        result.unanalyzed.push({
          videoId: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          reason: 'no_market_data',
          analysis,
        });
        continue;
      }
      
      // 최종 판단
      const predictedDirection = analysis.toneAnalysis.tone === 'positive' ? 'bullish' : 'bearish';
      const actualDirection = marketData.direction === 'up' ? 'bullish' 
        : marketData.direction === 'down' ? 'bearish' 
        : 'flat';
      
      // 역지표 판정: 예측과 실제가 반대면 🍯
      const isHoney = (predictedDirection === 'bullish' && actualDirection === 'bearish') ||
                      (predictedDirection === 'bearish' && actualDirection === 'bullish');
      
      const reasoning = isHoney
        ? `${analysis.toneAnalysis.tone === 'positive' ? '긍정적' : '부정적'} 전망(${predictedDirection}) 했으나 실제 ${actualDirection === 'bullish' ? '상승' : '하락'} → 역지표 적중`
        : `${analysis.toneAnalysis.tone === 'positive' ? '긍정적' : '부정적'} 전망(${predictedDirection}) 했고 실제 ${actualDirection === 'bullish' ? '상승' : actualDirection === 'bearish' ? '하락' : '보합'} → 예측대로`;
      
      result.analyzed.push({
        videoId: video.id,
        title: video.title,
        publishedAt: video.publishedAt,
        analysis,
        marketData: {
          asset,
          ticker: mapping.ticker,
          closePrice: marketData.closePrice,
          previousClose: marketData.previousClose,
          priceChange: Math.round(marketData.priceChange * 100) / 100,
          direction: marketData.direction,
          tradingDate: marketData.closePriceDate,
        },
        judgment: {
          predictedDirection,
          actualDirection,
          isHoney,
          reasoning,
        },
      });
    }
  }
  
  return result;
}

// ============================================================
// 메인 실행
// ============================================================

async function main() {
  // 커맨드라인 인자 파싱: --year YYYY --month M
  const args = process.argv.slice(2);
  let targetYear: number | null = null;
  let targetMonth: number | null = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && args[i + 1]) {
      targetYear = parseInt(args[i + 1]);
    }
    if (args[i] === '--month' && args[i + 1]) {
      targetMonth = parseInt(args[i + 1]);
    }
  }
  
  if (targetYear && targetMonth) {
    console.log(`🔍 전반꿀 연구소 분석 v3: ${targetYear}년 ${targetMonth}월만 처리\n`);
  } else {
    console.log('🔍 전반꿀 연구소 분석 v3 (LLM 기반) 시작...\n');
  }
  
  // 통계
  const stats = {
    totalVideos: 0,
    analyzed: 0,
    unanalyzed: 0,
    excluded: 0,
    honeyCount: 0,
  };
  
  // 연/월 목록 결정
  let yearMonths: Array<{year: string; month: string}> = [];
  
  if (targetYear && targetMonth) {
    // 특정 월만 처리
    const monthStr = String(targetMonth).padStart(2, '0');
    yearMonths = [{ year: String(targetYear), month: monthStr }];
  } else {
    // 모든 월별 디렉토리 탐색
    const years = fs.readdirSync(DATA_DIR).filter(d => /^\d{4}$/.test(d)).sort();
    for (const year of years) {
      const yearPath = path.join(DATA_DIR, year);
      const months = fs.readdirSync(yearPath).filter(d => /^\d{2}$/.test(d)).sort();
      for (const month of months) {
        yearMonths.push({ year, month });
      }
    }
  }
  
  for (const { year, month } of yearMonths) {
    console.log(`📅 ${year}/${month} 처리 중...`);
    
    const result = await processMonth(parseInt(year), parseInt(month));
    
    // 저장
    const monthDir = path.join(DATA_DIR, year, month);
    
    fs.writeFileSync(
      path.join(monthDir, 'analyzed.json'),
      JSON.stringify(result.analyzed, null, 2)
    );
    fs.writeFileSync(
      path.join(monthDir, 'unanalyzed.json'),
      JSON.stringify(result.unanalyzed, null, 2)
    );
    fs.writeFileSync(
      path.join(monthDir, 'excluded.json'),
      JSON.stringify(result.excluded, null, 2)
    );
    
    // 통계 업데이트
    stats.analyzed += result.analyzed.length;
    stats.unanalyzed += result.unanalyzed.length;
    stats.excluded += result.excluded.length;
    stats.honeyCount += result.analyzed.filter(a => a.judgment.isHoney).length;
    
    console.log(`   분석: ${result.analyzed.length}, 미분석: ${result.unanalyzed.length}, 제외: ${result.excluded.length}`);
  }
  
  // 최종 결과
  const honeyIndex = stats.analyzed > 0 
    ? Math.round((stats.honeyCount / stats.analyzed) * 1000) / 10 
    : 0;
  
  console.log('\n==================================================');
  console.log('📊 전체 분석 결과 (LLM 기반)');
  console.log('==================================================');
  console.log(`분석 완료: ${stats.analyzed}개`);
  console.log(`미분석: ${stats.unanalyzed}개`);
  console.log(`제외: ${stats.excluded}개`);
  console.log(`역지표 적중: ${stats.honeyCount}개`);
  console.log(`\n🍯 전반꿀 지수: ${honeyIndex}%`);
  console.log('==================================================\n');
  
  console.log('💾 결과 저장 완료');
}

main().catch(console.error);
