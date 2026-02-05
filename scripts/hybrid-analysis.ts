#!/usr/bin/env npx tsx
/**
 * 하이브리드 분석: 종목 언급 + 톤(긍정/부정) 기반 역지표 계산
 * 
 * 기존 방식: 명확한 "상승/하락 예측"만 카운트 → 38개
 * 하이브리드: 종목 언급 + 톤만 있으면 카운트 → 더 많은 샘플
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
  Tesla: [/테슬라/i, /tesla/i, /tsla/i],
  Bitcoin: [/비트코인/i, /bitcoin/i, /btc/i, /코인/i],
};

// 긍정 톤 키워드
const POSITIVE_KEYWORDS = [
  '상승', '급등', '폭등', '오른다', '올라', '반등', '회복', '좋은', '호재',
  '매수', '사야', '담아', '저점', '기회', '황금', '대박', '신고가', '돌파',
  '불장', '상승장', '강세', '최고', '역대급', '터진다', '간다',
];

// 부정 톤 키워드  
const NEGATIVE_KEYWORDS = [
  '하락', '급락', '폭락', '떨어', '내린다', '내려', '붕괴', '위기', '악재',
  '매도', '팔아', '빠져', '고점', '위험', '경고', '폭망', '신저가', '무너',
  '곰장', '하락장', '약세', '최악', '충격', '터졌다', '망한다', '끝났다',
];

// 부정어 (톤 반전)
const NEGATION_WORDS = ['아니', '없', '안 ', '못 ', '말라', '마라', '마세요'];

interface Video {
  id: string;
  title: string;
  publishedAt: string;
}

interface Mention {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  tone: 'positive' | 'negative' | 'neutral';
  actualDirection?: 'up' | 'down' | 'flat' | 'no_data';
  isHoney?: boolean;
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

function analyzeTone(title: string): 'positive' | 'negative' | 'neutral' {
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
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

// yfinance로 시장 데이터 조회
function getMarketDirection(asset: string, date: string): 'up' | 'down' | 'flat' | 'no_data' {
  try {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3일 범위로 조회 (휴장일 대비)
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const projectDir = path.join(__dirname, '..');
    const scriptPath = path.join(__dirname, 'get_direction.py');
    
    const result = execSync(
      `cd ${projectDir} && source venv/bin/activate && python3 ${scriptPath} "${asset}" "${startStr}" "${endStr}"`, 
      { 
        encoding: 'utf-8',
        timeout: 15000,
        shell: '/bin/bash',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();
    
    return result as 'up' | 'down' | 'flat' | 'no_data';
  } catch (e) {
    return 'no_data';
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

async function main() {
  console.log('🔍 하이브리드 분석 시작...\n');
  
  // 수동 레이블 로드
  const manualLabels = loadManualLabels();
  const manualCount = Object.keys(manualLabels).length;
  if (manualCount > 0) {
    console.log(`📋 수동 레이블: ${manualCount}개 로드됨\n`);
  }
  
  // 모든 영상 로드
  const allVideos: Video[] = [];
  const years = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}$/.test(f));
  
  for (const year of years) {
    const yearDir = path.join(DATA_DIR, year);
    const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));
    
    for (const month of months) {
      const videosPath = path.join(yearDir, month, 'videos.json');
      if (fs.existsSync(videosPath)) {
        const videos = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));
        allVideos.push(...videos);
      }
    }
  }
  
  console.log(`📺 전체 영상: ${allVideos.length}개\n`);
  
  // 종목 언급 추출
  const mentions: Mention[] = [];
  
  for (const video of allVideos) {
    const assets = detectAssets(video.title);
    
    for (const asset of assets) {
      const labelKey = `${video.id}_${asset}`;
      const manualLabel = manualLabels[labelKey];
      
      // 수동 레이블이 skip이면 제외
      if (manualLabel === 'skip') continue;
      
      // 수동 레이블 우선, 없으면 자동 분석
      const tone = manualLabel || analyzeTone(video.title);
      
      mentions.push({
        videoId: video.id,
        title: video.title,
        publishedAt: video.publishedAt,
        asset,
        tone,
      });
    }
  }
  
  console.log(`📊 종목 언급: ${mentions.length}개`);
  console.log(`   - 긍정: ${mentions.filter(m => m.tone === 'positive').length}개`);
  console.log(`   - 부정: ${mentions.filter(m => m.tone === 'negative').length}개`);
  console.log(`   - 중립: ${mentions.filter(m => m.tone === 'neutral').length}개\n`);
  
  // 중립 제외하고 시장 데이터 조회
  const analyzableMentions = mentions.filter(m => m.tone !== 'neutral');
  console.log(`🎯 분석 대상 (긍정/부정만): ${analyzableMentions.length}개\n`);
  
  console.log('📈 시장 데이터 조회 중... (시간 소요됨)\n');
  
  let processed = 0;
  for (const mention of analyzableMentions) {
    mention.actualDirection = getMarketDirection(mention.asset, mention.publishedAt);
    
    // 역지표 판정
    if (mention.actualDirection !== 'no_data' && mention.actualDirection !== 'flat') {
      if (mention.tone === 'positive' && mention.actualDirection === 'down') {
        mention.isHoney = true;
      } else if (mention.tone === 'negative' && mention.actualDirection === 'up') {
        mention.isHoney = true;
      } else {
        mention.isHoney = false;
      }
    }
    
    processed++;
    if (processed % 20 === 0) {
      console.log(`   진행: ${processed}/${analyzableMentions.length}`);
    }
  }
  
  // 결과 집계
  const validMentions = analyzableMentions.filter(m => m.isHoney !== undefined);
  const honeyCount = validMentions.filter(m => m.isHoney).length;
  const honeyIndex = validMentions.length > 0 
    ? ((honeyCount / validMentions.length) * 100).toFixed(1)
    : 0;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 하이브리드 분석 결과');
  console.log('='.repeat(50));
  console.log(`전체 영상: ${allVideos.length}개`);
  console.log(`종목 언급: ${mentions.length}개`);
  console.log(`분석 가능 (긍정/부정): ${analyzableMentions.length}개`);
  console.log(`유효 데이터: ${validMentions.length}개`);
  console.log(`역지표 적중: ${honeyCount}개`);
  console.log(`\n🍯 전반꿀 지수: ${honeyIndex}%`);
  console.log('='.repeat(50));
  
  // 종목별 통계
  console.log('\n📈 종목별 꿀지수:');
  const assetStats: Record<string, { total: number; honey: number }> = {};
  
  for (const mention of validMentions) {
    if (!assetStats[mention.asset]) {
      assetStats[mention.asset] = { total: 0, honey: 0 };
    }
    assetStats[mention.asset].total++;
    if (mention.isHoney) assetStats[mention.asset].honey++;
  }
  
  for (const [asset, stats] of Object.entries(assetStats)) {
    const idx = stats.total > 0 ? ((stats.honey / stats.total) * 100).toFixed(1) : 0;
    console.log(`   ${asset}: ${idx}% (${stats.honey}/${stats.total})`);
  }
  
  // 결과 저장
  const result = {
    updatedAt: new Date().toISOString(),
    methodology: 'hybrid',
    description: '종목 언급 + 톤(긍정/부정) 기반 역지표',
    stats: {
      totalVideos: allVideos.length,
      totalMentions: mentions.length,
      analyzableMentions: analyzableMentions.length,
      validMentions: validMentions.length,
      honeyCount,
      honeyIndex: parseFloat(honeyIndex as string),
    },
    assetStats: Object.entries(assetStats).map(([asset, stats]) => ({
      asset,
      total: stats.total,
      honey: stats.honey,
      honeyIndex: stats.total > 0 ? parseFloat(((stats.honey / stats.total) * 100).toFixed(1)) : 0,
    })),
    mentions: validMentions,
  };
  
  const outputPath = path.join(DATA_DIR, 'stats', 'hybrid-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 결과 저장: ${outputPath}`);
}

main().catch(console.error);
