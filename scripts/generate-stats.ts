#!/usr/bin/env npx tsx
/**
 * 통계 생성 스크립트
 * 
 * 월별 analyzed.json, unanalyzed.json, excluded.json 파일을 읽어서
 * data/stats/hybrid-analysis.json 및 overall.json 생성
 * 
 * 사용처: GitHub Actions, 수동 실행
 * 실행: npx tsx scripts/generate-stats.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const STATS_DIR = path.join(DATA_DIR, 'stats');

// v2 형식 (구버전)
interface AnalyzedItemV2 {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  tone: 'positive' | 'negative';
  actualDirection: 'up' | 'down' | 'flat';
  isHoney: boolean;
  closePrice?: number;
  closePriceDate?: string;
}

// v3 형식 (LLM 기반)
interface AnalyzedItemV3 {
  videoId: string;
  title: string;
  publishedAt: string;
  analysis: {
    method: string;
    model: string;
    detectedAssets: Array<{ asset: string; ticker: string }>;
    toneAnalysis: { tone: 'positive' | 'negative' | 'neutral' };
  };
  marketData: {
    asset: string;
    ticker: string;
    closePrice: number;
    previousClose?: number;
    priceChange?: number;
    direction: 'up' | 'down' | 'flat';
    tradingDate: string;
  };
  judgment: {
    predictedDirection: string;
    actualDirection: string;
    isHoney: boolean;
    reasoning: string;
  };
}

type AnalyzedItem = AnalyzedItemV2 | AnalyzedItemV3;

// v3 형식인지 확인
function isV3Format(item: AnalyzedItem): item is AnalyzedItemV3 {
  return 'analysis' in item && 'judgment' in item;
}

// 통합 getter 함수들
function getAsset(item: AnalyzedItem): string {
  if (isV3Format(item)) {
    return item.marketData?.asset || item.analysis?.detectedAssets?.[0]?.asset || 'Unknown';
  }
  return item.asset;
}

function getTone(item: AnalyzedItem): 'positive' | 'negative' | null {
  if (isV3Format(item)) {
    const tone = item.analysis?.toneAnalysis?.tone;
    return tone === 'neutral' ? null : tone || null;
  }
  return item.tone;
}

function getActualDirection(item: AnalyzedItem): 'up' | 'down' | 'flat' | null {
  if (isV3Format(item)) {
    return item.marketData?.direction || null;
  }
  return item.actualDirection;
}

function getIsHoney(item: AnalyzedItem): boolean {
  if (isV3Format(item)) {
    return item.judgment?.isHoney ?? false;
  }
  return item.isHoney;
}

interface UnanalyzedItem {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  reason: string;
}

interface ExcludedItem {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  reason: string;
}

interface MonthlyData {
  year: number;
  month: number;
  analyzed: AnalyzedItem[];
  unanalyzed: UnanalyzedItem[];
  excluded: ExcludedItem[];
  videoCount: number;
}

// 모든 월별 데이터 로드
function loadAllMonthlyData(): MonthlyData[] {
  const result: MonthlyData[] = [];
  
  for (const yearDir of fs.readdirSync(DATA_DIR)) {
    const yearPath = path.join(DATA_DIR, yearDir);
    if (!fs.statSync(yearPath).isDirectory()) continue;
    const year = parseInt(yearDir);
    if (isNaN(year)) continue;
    
    for (const monthDir of fs.readdirSync(yearPath)) {
      const monthPath = path.join(yearPath, monthDir);
      if (!fs.statSync(monthPath).isDirectory()) continue;
      const month = parseInt(monthDir);
      if (isNaN(month)) continue;
      
      const videosPath = path.join(monthPath, 'videos.json');
      const analyzedPath = path.join(monthPath, 'analyzed.json');
      const unanalyzedPath = path.join(monthPath, 'unanalyzed.json');
      const excludedPath = path.join(monthPath, 'excluded.json');
      
      let videoCount = 0;
      let analyzed: AnalyzedItem[] = [];
      let unanalyzed: UnanalyzedItem[] = [];
      let excluded: ExcludedItem[] = [];
      
      try {
        if (fs.existsSync(videosPath)) {
          videoCount = JSON.parse(fs.readFileSync(videosPath, 'utf-8')).length;
        }
        if (fs.existsSync(analyzedPath)) {
          analyzed = JSON.parse(fs.readFileSync(analyzedPath, 'utf-8'));
        }
        if (fs.existsSync(unanalyzedPath)) {
          unanalyzed = JSON.parse(fs.readFileSync(unanalyzedPath, 'utf-8'));
        }
        if (fs.existsSync(excludedPath)) {
          excluded = JSON.parse(fs.readFileSync(excludedPath, 'utf-8'));
        }
      } catch (e) {
        console.error(`Error loading ${year}/${month}:`, e);
      }
      
      result.push({ year, month, analyzed, unanalyzed, excluded, videoCount });
    }
  }
  
  return result.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// 종목별 통계 계산
function calculateAssetStats(analyzed: AnalyzedItem[]): { asset: string; total: number; honey: number; honeyIndex: number }[] {
  const assetMap = new Map<string, { total: number; honey: number }>();
  
  for (const item of analyzed) {
    const asset = getAsset(item);
    const current = assetMap.get(asset) || { total: 0, honey: 0 };
    current.total++;
    if (getIsHoney(item)) current.honey++;
    assetMap.set(asset, current);
  }
  
  return Array.from(assetMap.entries())
    .map(([asset, stats]) => ({
      asset,
      total: stats.total,
      honey: stats.honey,
      honeyIndex: stats.total > 0 ? Math.round((stats.honey / stats.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.honeyIndex - a.honeyIndex);
}

// 메인 실행
function main() {
  console.log('📊 통계 생성 시작...\n');
  
  const monthlyData = loadAllMonthlyData();
  
  // 전체 통계 계산
  const allAnalyzed: AnalyzedItem[] = [];
  const allUnanalyzed: UnanalyzedItem[] = [];
  const allExcluded: ExcludedItem[] = [];
  let totalVideos = 0;
  
  // 월별 통계
  const periods: { year: number; month: number; predictions: number; honeyIndex: number }[] = [];
  
  for (const data of monthlyData) {
    totalVideos += data.videoCount;
    allAnalyzed.push(...data.analyzed);
    allUnanalyzed.push(...data.unanalyzed);
    allExcluded.push(...data.excluded);
    
    const monthHoney = data.analyzed.filter(a => getIsHoney(a)).length;
    periods.push({
      year: data.year,
      month: data.month,
      predictions: data.analyzed.length,
      honeyIndex: data.analyzed.length > 0 
        ? Math.round((monthHoney / data.analyzed.length) * 1000) / 10 
        : 0,
    });
    
    console.log(`${data.year}/${String(data.month).padStart(2, '0')}: ${data.videoCount} videos, ${data.analyzed.length} analyzed, ${data.unanalyzed.length} unanalyzed, ${data.excluded.length} excluded`);
  }
  
  const totalHoney = allAnalyzed.filter(a => getIsHoney(a)).length;
  const honeyIndex = allAnalyzed.length > 0 
    ? Math.round((totalHoney / allAnalyzed.length) * 1000) / 10 
    : 0;
  
  // 종목 언급 수 (중복 제거)
  const mentionedVideos = new Set([
    ...allAnalyzed.map(a => a.videoId),
    ...allUnanalyzed.map(u => u.videoId),
    ...allExcluded.map(e => e.videoId),
  ]);
  
  console.log('\n=== 전체 통계 ===');
  console.log(`총 영상: ${totalVideos}`);
  console.log(`종목 언급: ${mentionedVideos.size}`);
  console.log(`분석 완료: ${allAnalyzed.length}`);
  console.log(`톤 미확정: ${allUnanalyzed.length}`);
  console.log(`제외: ${allExcluded.length}`);
  console.log(`역지표 적중: ${totalHoney}`);
  console.log(`🍯 전반꿀 지수: ${honeyIndex}%`);
  
  // hybrid-analysis.json 생성
  const hybridAnalysis = {
    updatedAt: new Date().toISOString(),
    methodology: 'hybrid',
    description: '종목 언급 + 톤(긍정/부정) 기반 역지표 (미국 장 종가 기준)',
    stats: {
      totalVideos,
      totalMentions: mentionedVideos.size,
      analyzableMentions: allAnalyzed.length + allUnanalyzed.length,
      validMentions: allAnalyzed.length,
      honeyCount: totalHoney,
      honeyIndex,
    },
    funnel: {
      totalVideos,
      withMentions: mentionedVideos.size,
      withTone: allAnalyzed.length,
      withMarketData: allAnalyzed.length,
      honeyHits: totalHoney,
    },
    unanalyzedCount: allUnanalyzed.length,
    excludedCount: allExcluded.length,
    assetStats: calculateAssetStats(allAnalyzed),
    mentions: allAnalyzed
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map(a => ({
        videoId: a.videoId,
        title: a.title,
        publishedAt: a.publishedAt,
        asset: getAsset(a),
        tone: getTone(a) === 'positive' ? 'positive' : 'negative',
        actualDirection: getActualDirection(a) || 'flat',
        isHoney: getIsHoney(a),
        // v3 포맷에서 가격 변동률 추출
        priceChange: isV3Format(a) ? (a.marketData?.priceChange ?? null) : null,
      })),
  };
  
  // overall.json 생성
  const overall = {
    updatedAt: new Date().toISOString(),
    methodology: {
      assets: ['KOSPI', 'SP500', 'NASDAQ', 'Samsung', 'SKHynix', 'Nvidia', 'Google', 'Tesla', 'Bitcoin'],
      timeframe: '미국 장 종가 기준',
      source: '전인구경제연구소 유튜브',
      definition: '전반꿀 지수 = (역방향 적중 수 / 전체 예측 수) × 100%',
    },
    stats: {
      totalPredictions: allAnalyzed.length,
      honeyCount: totalHoney,
      honeyIndex,
    },
    assetStats: calculateAssetStats(allAnalyzed),
    periods,
  };
  
  // 파일 저장
  fs.mkdirSync(STATS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(STATS_DIR, 'hybrid-analysis.json'),
    JSON.stringify(hybridAnalysis, null, 2)
  );
  fs.writeFileSync(
    path.join(STATS_DIR, 'overall.json'),
    JSON.stringify(overall, null, 2)
  );
  
  console.log('\n✅ 통계 파일 생성 완료:');
  console.log('  - data/stats/hybrid-analysis.json');
  console.log('  - data/stats/overall.json');
}

main();
