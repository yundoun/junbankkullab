#!/usr/bin/env npx tsx
/**
 * 전반꿀 연구소 분석 스크립트 v2
 * 
 * 개선사항:
 * - 톤 분석 키워드 확장
 * - 톤 판단 불가 시 unanalyzed로 분류
 * - 시장 데이터: 영상 발행일 기준 미국 장 종가
 * - 알트코인 제외 (excluded로 분류)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DATA_DIR = path.join(__dirname, '../data');

// 종목 패턴
const ASSET_PATTERNS: Record<string, RegExp[]> = {
  KOSPI: [/코스피/i, /kospi/i, /국장/i, /한국.*증시/i, /한국.*주식/i],
  SP500: [/S&?P\s*500/i, /에스앤피/i, /에스피/i],
  NASDAQ: [/나스닥/i, /nasdaq/i, /미국.*증시/i, /미장/i],
  Samsung: [/삼성전자/i, /삼전/i],
  SKHynix: [/하이닉스/i, /sk하이닉스/i],
  Nvidia: [/엔비디아/i, /nvidia/i, /nvda/i],
  Google: [/구글/i, /google/i, /googl/i, /알파벳/i],
  Tesla: [/테슬라/i, /tesla/i, /tsla/i],
  Bitcoin: [/비트코인/i, /bitcoin/i, /btc/i],
};

// 알트코인 패턴 (제외 대상)
const ALTCOIN_PATTERNS: RegExp[] = [
  /알트코인/i, /알트/i,
  /이더리움/i, /ethereum/i, /eth/i,
  /리플/i, /xrp/i,
  /솔라나/i, /solana/i, /sol/i,
  /도지코인/i, /doge/i,
  /시바이누/i, /shib/i,
  /에이다/i, /cardano/i, /ada/i,
  /폴카닷/i, /polkadot/i, /dot/i,
  /아발란체/i, /avalanche/i, /avax/i,
  /체인링크/i, /chainlink/i, /link/i,
];

// 긍정 톤 키워드 (기존 + 추가)
const POSITIVE_KEYWORDS = [
  // 기존
  '상승', '급등', '폭등', '오른다', '올라', '반등', '회복', '좋은', '호재',
  '매수', '사야', '담아', '저점', '황금', '신고가', '돌파',
  '불장', '상승장', '강세', '최고', '역대급', '터진다',
  // 추가
  '갑니다', '사세요', '담으세요', '기회', '5억', '10억', '대박', '간다',
];

// 부정 톤 키워드 (기존 + 추가)
const NEGATIVE_KEYWORDS = [
  // 기존
  '하락', '급락', '떨어', '내린다', '내려', '붕괴', '위기', '악재',
  '매도', '고점', '경고', '폭망', '신저가',
  '곰장', '하락장', '약세', '최악', '충격', '터졌다', '망한다', '끝났다',
  // 추가
  '무너', '끝', '위험', '폭락', '조심', '팔아', '빠져',
];

// 부정어 (톤 반전)
const NEGATION_WORDS = ['아니', '없', '안 ', '못 ', '말라', '마라', '마세요'];

interface Video {
  id: string;
  title: string;
  publishedAt: string;
}

interface BaseMention {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
}

interface AnalyzedMention extends BaseMention {
  tone: 'positive' | 'negative';
  actualDirection: 'up' | 'down' | 'flat';
  isHoney: boolean;
  closePrice?: number;
  closePriceDate?: string;
}

interface UnanalyzedMention extends BaseMention {
  reason: 'no_tone' | 'no_market_data';
  positiveScore: number;
  negativeScore: number;
}

interface ExcludedMention extends BaseMention {
  reason: 'altcoin';
  matchedPattern: string;
}

function detectAssets(title: string): string[] {
  const assets: string[] = [];
  for (const [asset, patterns] of Object.entries(ASSET_PATTERNS)) {
    if (patterns.some(p => p.test(title))) {
      assets.push(asset);
    }
  }
  return assets;
}

function detectAltcoins(title: string): string | null {
  for (const pattern of ALTCOIN_PATTERNS) {
    if (pattern.test(title)) {
      return pattern.source;
    }
  }
  return null;
}

function analyzeTone(title: string): { tone: 'positive' | 'negative' | 'neutral'; positiveScore: number; negativeScore: number } {
  let positiveScore = 0;
  let negativeScore = 0;
  
  const hasNegation = NEGATION_WORDS.some(w => title.includes(w));
  
  for (const keyword of POSITIVE_KEYWORDS) {
    if (title.includes(keyword)) positiveScore++;
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (title.includes(keyword)) negativeScore++;
  }
  
  // 부정어 있으면 톤 반전
  if (hasNegation) {
    [positiveScore, negativeScore] = [negativeScore, positiveScore];
  }
  
  let tone: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveScore > negativeScore) tone = 'positive';
  else if (negativeScore > positiveScore) tone = 'negative';
  
  return { tone, positiveScore, negativeScore };
}

/**
 * 영상 발행일 기준 미국 장 종가 조회
 * 한국시간 영상 → 해당 날짜 미국 장 종가
 */
function getClosePrice(asset: string, publishedAt: string): { direction: 'up' | 'down' | 'flat' | 'no_data'; closePrice?: number; closePriceDate?: string } {
  try {
    // 한국 시간 기준 날짜 추출
    const publishDate = new Date(publishedAt);
    const kstDate = new Date(publishDate.getTime() + (9 * 60 * 60 * 1000)); // UTC to KST
    const dateStr = kstDate.toISOString().split('T')[0];
    
    const projectDir = path.join(__dirname, '..');
    const scriptPath = path.join(__dirname, 'market_data.py');
    
    const result = execSync(
      `cd ${projectDir} && source venv/bin/activate && python3 ${scriptPath} close "${asset}" "${dateStr}"`, 
      { 
        encoding: 'utf-8',
        timeout: 15000,
        shell: '/bin/bash',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();
    
    const data = JSON.parse(result);
    
    if (data.error) {
      return { direction: 'no_data' };
    }
    
    return {
      direction: data.direction,
      closePrice: data.closePrice,
      closePriceDate: data.date,
    };
  } catch (e) {
    return { direction: 'no_data' };
  }
}

// 수동 레이블 로드
function loadManualLabels(): Record<string, 'positive' | 'negative' | 'skip'> {
  const labelsPath = path.join(DATA_DIR, 'review', 'manual-labels.json');
  if (fs.existsSync(labelsPath)) {
    const raw = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));
    const labels: Record<string, 'positive' | 'negative' | 'skip'> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value === 'P' || value === 'positive') labels[key] = 'positive';
      else if (value === 'N' || value === 'negative') labels[key] = 'negative';
      else if (value === 'S' || value === 'skip') labels[key] = 'skip';
    }
    return labels;
  }
  return {};
}

interface MonthlyResult {
  analyzed: AnalyzedMention[];
  unanalyzed: UnanalyzedMention[];
  excluded: ExcludedMention[];
}

async function main() {
  console.log('🔍 전반꿀 연구소 분석 v2 시작...\n');
  
  // 수동 레이블 로드
  const manualLabels = loadManualLabels();
  const manualCount = Object.keys(manualLabels).length;
  if (manualCount > 0) {
    console.log(`📋 수동 레이블: ${manualCount}개 로드됨\n`);
  }
  
  // 연도/월별로 처리
  const years = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}$/.test(f));
  
  const globalStats = {
    totalVideos: 0,
    analyzed: 0,
    unanalyzed: 0,
    excluded: 0,
    honeyCount: 0,
  };
  
  for (const year of years) {
    const yearDir = path.join(DATA_DIR, year);
    const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));
    
    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const videosPath = path.join(monthDir, 'videos.json');
      
      if (!fs.existsSync(videosPath)) continue;
      
      console.log(`📅 ${year}/${month} 처리 중...`);
      
      const videos: Video[] = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));
      globalStats.totalVideos += videos.length;
      
      const monthResult: MonthlyResult = {
        analyzed: [],
        unanalyzed: [],
        excluded: [],
      };
      
      for (const video of videos) {
        // 알트코인 체크
        const altcoinMatch = detectAltcoins(video.title);
        if (altcoinMatch) {
          // Bitcoin 언급이 있으면 알트코인이라도 Bitcoin은 분석
          const assets = detectAssets(video.title);
          const hasBitcoin = assets.includes('Bitcoin');
          
          // 알트코인으로 제외
          monthResult.excluded.push({
            videoId: video.id,
            title: video.title,
            publishedAt: video.publishedAt,
            asset: 'Altcoin',
            reason: 'altcoin',
            matchedPattern: altcoinMatch,
          });
          globalStats.excluded++;
          
          // Bitcoin이 있으면 Bitcoin만 따로 분석
          if (hasBitcoin) {
            processAsset(video, 'Bitcoin', manualLabels, monthResult, globalStats);
          }
          continue;
        }
        
        // 종목 감지
        const assets = detectAssets(video.title);
        for (const asset of assets) {
          processAsset(video, asset, manualLabels, monthResult, globalStats);
        }
      }
      
      // 월별 결과 저장
      if (monthResult.analyzed.length > 0) {
        fs.writeFileSync(
          path.join(monthDir, 'analyzed.json'),
          JSON.stringify(monthResult.analyzed, null, 2)
        );
      }
      
      if (monthResult.unanalyzed.length > 0) {
        fs.writeFileSync(
          path.join(monthDir, 'unanalyzed.json'),
          JSON.stringify(monthResult.unanalyzed, null, 2)
        );
      }
      
      if (monthResult.excluded.length > 0) {
        fs.writeFileSync(
          path.join(monthDir, 'excluded.json'),
          JSON.stringify(monthResult.excluded, null, 2)
        );
      }
      
      console.log(`   분석: ${monthResult.analyzed.length}, 미분석: ${monthResult.unanalyzed.length}, 제외: ${monthResult.excluded.length}`);
    }
  }
  
  // 전체 통계
  const honeyIndex = globalStats.analyzed > 0 
    ? ((globalStats.honeyCount / globalStats.analyzed) * 100).toFixed(1)
    : '0';
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 전체 분석 결과');
  console.log('='.repeat(50));
  console.log(`전체 영상: ${globalStats.totalVideos}개`);
  console.log(`분석 완료: ${globalStats.analyzed}개`);
  console.log(`미분석 (톤 판단 불가): ${globalStats.unanalyzed}개`);
  console.log(`제외 (알트코인): ${globalStats.excluded}개`);
  console.log(`역지표 적중: ${globalStats.honeyCount}개`);
  console.log(`\n🍯 전반꿀 지수: ${honeyIndex}%`);
  console.log('='.repeat(50));
  
  // 전체 통계 저장
  const statsDir = path.join(DATA_DIR, 'stats');
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(statsDir, 'analysis-v2.json'),
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      methodology: 'v2',
      description: '종목 언급 + 톤 분석 + 미국 장 종가 기준',
      stats: globalStats,
      honeyIndex: parseFloat(honeyIndex),
    }, null, 2)
  );
  
  console.log(`\n💾 결과 저장 완료`);
}

function processAsset(
  video: Video,
  asset: string,
  manualLabels: Record<string, 'positive' | 'negative' | 'skip'>,
  monthResult: MonthlyResult,
  globalStats: typeof main extends () => Promise<infer R> ? { totalVideos: number; analyzed: number; unanalyzed: number; excluded: number; honeyCount: number } : never
) {
  const labelKey = `${video.id}_${asset}`;
  const manualLabel = manualLabels[labelKey];
  
  // 수동 레이블이 skip이면 제외
  if (manualLabel === 'skip') return;
  
  // 톤 분석
  const { tone: autoTone, positiveScore, negativeScore } = analyzeTone(video.title);
  const tone = manualLabel || autoTone;
  
  // 톤 판단 불가 (neutral) → unanalyzed
  if (tone === 'neutral') {
    monthResult.unanalyzed.push({
      videoId: video.id,
      title: video.title,
      publishedAt: video.publishedAt,
      asset,
      reason: 'no_tone',
      positiveScore,
      negativeScore,
    });
    globalStats.unanalyzed++;
    return;
  }
  
  // 시장 데이터 조회
  const { direction, closePrice, closePriceDate } = getClosePrice(asset, video.publishedAt);
  
  // 시장 데이터 없음 → unanalyzed
  if (direction === 'no_data') {
    monthResult.unanalyzed.push({
      videoId: video.id,
      title: video.title,
      publishedAt: video.publishedAt,
      asset,
      reason: 'no_market_data',
      positiveScore,
      negativeScore,
    });
    globalStats.unanalyzed++;
    return;
  }
  
  // 역지표 판정
  let isHoney = false;
  if (direction !== 'flat') {
    if (tone === 'positive' && direction === 'down') {
      isHoney = true;
    } else if (tone === 'negative' && direction === 'up') {
      isHoney = true;
    }
  }
  
  monthResult.analyzed.push({
    videoId: video.id,
    title: video.title,
    publishedAt: video.publishedAt,
    asset,
    tone: tone as 'positive' | 'negative',
    actualDirection: direction,
    isHoney,
    closePrice,
    closePriceDate,
  });
  globalStats.analyzed++;
  if (isHoney) globalStats.honeyCount++;
}

main().catch(console.error);
