#!/usr/bin/env npx tsx
/**
 * neutral 톤 재분석 스크립트 (GPT-4o)
 * 
 * GPT-4o-mini에서 neutral로 판단된 항목을 GPT-4o로 재분석
 * 여전히 neutral이면 제외, 아니면 분석에 포함
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'cache/gpt4o-reanalysis-cache.json');

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 캐시 로드
function loadCache(): Record<string, any> {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
  return {};
}

// 캐시 저장
function saveCache(cache: Record<string, any>) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 섹터-티커 맵 (llm-classifier.ts에서 가져옴)
const SECTOR_TICKER_MAP: Record<string, { ticker: string; market: 'KRX' | 'NYSE' | 'NASDAQ' | 'CRYPTO' }> = {
  'KOSPI': { ticker: '^KS11', market: 'KRX' },
  'KOSDAQ': { ticker: '^KQ11', market: 'KRX' },
  'S&P500': { ticker: '^GSPC', market: 'NYSE' },
  'NASDAQ': { ticker: '^IXIC', market: 'NASDAQ' },
  'Dow Jones': { ticker: '^DJI', market: 'NYSE' },
  'Samsung': { ticker: '005930.KS', market: 'KRX' },
  'SKHynix': { ticker: '000660.KS', market: 'KRX' },
  'Nvidia': { ticker: 'NVDA', market: 'NASDAQ' },
  'Google': { ticker: 'GOOGL', market: 'NASDAQ' },
  'Tesla': { ticker: 'TSLA', market: 'NASDAQ' },
  'Apple': { ticker: 'AAPL', market: 'NASDAQ' },
  'Microsoft': { ticker: 'MSFT', market: 'NASDAQ' },
  'Amazon': { ticker: 'AMZN', market: 'NASDAQ' },
  'Meta': { ticker: 'META', market: 'NASDAQ' },
  'Bitcoin': { ticker: 'BTC-USD', market: 'CRYPTO' },
  'Ethereum': { ticker: 'ETH-USD', market: 'CRYPTO' },
  'Shipbuilding': { ticker: '009540.KS', market: 'KRX' },
  'Defense': { ticker: '012450.KS', market: 'KRX' },
  'Battery': { ticker: '373220.KS', market: 'KRX' },
  'Automotive': { ticker: '005380.KS', market: 'KRX' },
  'Bio': { ticker: '068270.KS', market: 'KRX' },
  'Banking': { ticker: '105560.KS', market: 'KRX' },
  'Construction': { ticker: '000720.KS', market: 'KRX' },
  'Steel': { ticker: '005490.KS', market: 'KRX' },
  'Chemical': { ticker: '051910.KS', market: 'KRX' },
  'Energy': { ticker: '096770.KS', market: 'KRX' },
  'Retail': { ticker: '004170.KS', market: 'KRX' },
  'Telecom': { ticker: '017670.KS', market: 'KRX' },
  'Nuclear': { ticker: '009830.KS', market: 'KRX' },
  'AI': { ticker: 'NVDA', market: 'NASDAQ' },
  'Semiconductor': { ticker: '005930.KS', market: 'KRX' },
  'Internet': { ticker: '035720.KS', market: 'KRX' },
  'Gold': { ticker: 'GC=F', market: 'NYSE' },
  'Silver': { ticker: 'SI=F', market: 'NYSE' },
  'Oil': { ticker: 'CL=F', market: 'NYSE' },
  'Palantir': { ticker: 'PLTR', market: 'NYSE' },
  'Broadcom': { ticker: 'AVGO', market: 'NASDAQ' },
  'AMD': { ticker: 'AMD', market: 'NASDAQ' },
  'Intel': { ticker: 'INTC', market: 'NASDAQ' },
};

// GPT-4o로 톤 재분석
async function reanalyzeWithGPT4o(title: string, cache: Record<string, any>): Promise<{
  tone: 'positive' | 'negative' | 'neutral';
  reasoning: string;
  confidence: number;
}> {
  // 캐시 확인
  if (cache[title]) {
    console.log(`  [캐시 히트] ${title.slice(0, 40)}...`);
    return cache[title];
  }

  console.log(`  [GPT-4o 분석] ${title.slice(0, 40)}...`);

  const prompt = `당신은 금융 뉴스 분석가입니다. 아래 유튜브 영상 제목을 보고 해당 자산/시장에 대한 전망이 긍정적인지 부정적인지 판단해주세요.

제목: "${title}"

## 판단 기준
- **긍정적(positive)**: 상승, 매수, 호재, 기회, 좋다, 오른다 등 낙관적 전망
- **부정적(negative)**: 하락, 위험, 악재, 조심, 나쁘다, 떨어진다 등 비관적 전망
- **중립(neutral)**: 정보 제공만 하거나, 양쪽 가능성 모두 언급하거나, 전망이 명확하지 않음

## 중요
- 제목만 보고 판단이 애매하더라도, 뉘앙스를 읽고 가장 가까운 쪽으로 분류해주세요
- 정말 판단이 불가능한 경우에만 neutral을 선택하세요
- 한국 주식 유튜버의 제목이므로 한국어 뉘앙스를 잘 파악해주세요

JSON 형식으로 응답해주세요:
{
  "tone": "positive" | "negative" | "neutral",
  "reasoning": "판단 근거 (한국어로)",
  "confidence": 0.0~1.0 (확신도)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      cache[title] = result;
      saveCache(cache);
      return result;
    }
  } catch (error) {
    console.error(`  [에러] ${title}: ${error}`);
  }

  return { tone: 'neutral', reasoning: '분석 실패', confidence: 0 };
}

// 시장 데이터 가져오기 (analyze-v3.ts 방식과 동일)
function getMarketData(asset: string, date: string): {
  closePrice: number;
  previousClose: number;
  priceChange: number;
  direction: 'up' | 'down' | 'flat';
  tradingDate: string;
} | null {
  try {
    const projectDir = path.join(__dirname, '..');
    const pythonCmd = `source venv/bin/activate && python3 scripts/market_data.py close ${asset} ${date}`;
    
    const result = execSync(
      `cd "${projectDir}" && ${pythonCmd}`,
      { encoding: 'utf-8', timeout: 30000, shell: '/bin/bash' }
    );
    
    const data = JSON.parse(result.trim());
    if (data.error) return null;
    
    return {
      closePrice: data.closePrice,
      previousClose: data.previousClose,
      priceChange: data.priceChange,
      direction: data.direction,
      tradingDate: data.tradingDate,
    };
  } catch (error) {
    return null;
  }
}

// 메인 실행
async function main() {
  console.log('🔍 GPT-4o로 neutral 항목 재분석 시작...\n');

  const cache = loadCache();
  let totalReanalyzed = 0;
  let totalConverted = 0;
  let totalStillNeutral = 0;

  // 모든 월별 폴더 순회
  for (const yearDir of fs.readdirSync(DATA_DIR).sort()) {
    const yearPath = path.join(DATA_DIR, yearDir);
    if (!fs.statSync(yearPath).isDirectory()) continue;
    if (!/^\d{4}$/.test(yearDir)) continue;

    for (const monthDir of fs.readdirSync(yearPath).sort()) {
      const monthPath = path.join(yearPath, monthDir);
      if (!fs.statSync(monthPath).isDirectory()) continue;

      const unanalyzedPath = path.join(monthPath, 'unanalyzed.json');
      const analyzedPath = path.join(monthPath, 'analyzed.json');

      if (!fs.existsSync(unanalyzedPath)) continue;

      const unanalyzed = JSON.parse(fs.readFileSync(unanalyzedPath, 'utf-8'));
      const analyzed = fs.existsSync(analyzedPath) 
        ? JSON.parse(fs.readFileSync(analyzedPath, 'utf-8')) 
        : [];

      // no_tone 항목만 필터링
      const neutralItems = unanalyzed.filter((item: any) => 
        item.reason === 'no_tone' || item.reason === 'neutral_tone'
      );

      if (neutralItems.length === 0) continue;

      console.log(`📅 ${yearDir}/${monthDir} - ${neutralItems.length}개 neutral 항목`);

      const stillUnanalyzed: any[] = [];
      const newAnalyzed: any[] = [];

      for (const item of neutralItems) {
        totalReanalyzed++;

        // GPT-4o로 재분석
        const result = await reanalyzeWithGPT4o(item.title, cache);

        if (result.tone === 'neutral') {
          // 여전히 neutral → unanalyzed 유지
          stillUnanalyzed.push({
            ...item,
            reason: 'still_neutral_after_gpt4o',
            gpt4oAnalysis: result,
          });
          totalStillNeutral++;
        } else {
          // 톤 결정됨 → 시장 데이터 조회 시도
          const asset = item.asset;
          const tickerInfo = SECTOR_TICKER_MAP[asset];
          
          if (!tickerInfo) {
            stillUnanalyzed.push({
              ...item,
              reason: 'no_ticker_mapping',
              gpt4oAnalysis: result,
            });
            continue;
          }

          const publishDate = item.publishedAt.split('T')[0];
          const marketData = getMarketData(asset, publishDate);

          if (!marketData) {
            stillUnanalyzed.push({
              ...item,
              reason: 'no_market_data',
              gpt4oAnalysis: result,
            });
            continue;
          }

          // 꿀지수 계산
          const predictedDirection = result.tone === 'positive' ? 'bullish' : 'bearish';
          const actualDirection = marketData.direction === 'up' ? 'bullish' : 'bearish';
          const isHoney = predictedDirection !== actualDirection;

          newAnalyzed.push({
            videoId: item.videoId,
            title: item.title,
            publishedAt: item.publishedAt,
            analysis: {
              method: 'llm-gpt4o-reanalysis',
              model: 'gpt-4o',
              timestamp: new Date().toISOString(),
              detectedAssets: [{ asset, ticker: tickerInfo.ticker }],
              toneAnalysis: {
                tone: result.tone,
                reasoning: result.reasoning,
                confidence: result.confidence,
              },
            },
            marketData: {
              asset,
              ticker: tickerInfo.ticker,
              closePrice: marketData.closePrice,
              previousClose: marketData.previousClose,
              priceChange: marketData.priceChange,
              direction: marketData.direction,
              tradingDate: marketData.tradingDate,
            },
            judgment: {
              predictedDirection,
              actualDirection,
              isHoney,
              reasoning: `GPT-4o 재분석: ${result.tone === 'positive' ? '긍정' : '부정'} 전망 → 실제 ${marketData.direction === 'up' ? '상승' : '하락'} → ${isHoney ? '역지표 적중!' : '예측대로'}`,
            },
          });
          totalConverted++;
        }
      }

      // 파일 업데이트
      const remainingUnanalyzed = unanalyzed.filter((item: any) => 
        item.reason !== 'no_tone' && item.reason !== 'neutral_tone'
      );
      
      fs.writeFileSync(
        unanalyzedPath,
        JSON.stringify([...remainingUnanalyzed, ...stillUnanalyzed], null, 2)
      );

      if (newAnalyzed.length > 0) {
        fs.writeFileSync(
          analyzedPath,
          JSON.stringify([...analyzed, ...newAnalyzed], null, 2)
        );
        console.log(`  ✅ ${newAnalyzed.length}개 분석에 추가됨`);
      }
    }
  }

  console.log('\n==================================================');
  console.log('📊 GPT-4o 재분석 결과');
  console.log('==================================================');
  console.log(`재분석 시도: ${totalReanalyzed}개`);
  console.log(`분석에 추가: ${totalConverted}개`);
  console.log(`여전히 중립: ${totalStillNeutral}개`);
  console.log('==================================================\n');
}

main().catch(console.error);
