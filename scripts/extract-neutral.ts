#!/usr/bin/env npx tsx
/**
 * 중립 톤 언급 추출 - 사람이 검토할 수 있도록 리스트화
 */

import * as fs from 'fs';
import * as path from 'path';

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

interface NeutralMention {
  videoId: string;
  title: string;
  publishedAt: string;
  asset: string;
  url: string;
  suggestedTone?: 'positive' | 'negative' | 'skip';
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
  
  if (hasNegation) {
    [positiveScore, negativeScore] = [negativeScore, positiveScore];
  }
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

async function main() {
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
  
  // 중립 톤 언급 추출
  const neutralMentions: NeutralMention[] = [];
  
  for (const video of allVideos) {
    const assets = detectAssets(video.title);
    const tone = analyzeTone(video.title);
    
    if (tone === 'neutral' && assets.length > 0) {
      for (const asset of assets) {
        neutralMentions.push({
          videoId: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          asset,
          url: `https://youtube.com/watch?v=${video.id}`,
        });
      }
    }
  }
  
  // 날짜순 정렬 (최신순)
  neutralMentions.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  
  // JSON 저장
  const outputPath = path.join(DATA_DIR, 'review', 'neutral-mentions.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(neutralMentions, null, 2));
  
  // 마크다운 리스트 생성
  let markdown = `# 중립 톤 검토 요청\n\n`;
  markdown += `총 ${neutralMentions.length}개 항목\n\n`;
  markdown += `## 판단 방법\n`;
  markdown += `- **P**: 긍정적 (상승 기대)\n`;
  markdown += `- **N**: 부정적 (하락 기대)\n`;
  markdown += `- **S**: 스킵 (분석 제외)\n\n`;
  markdown += `---\n\n`;
  
  for (let i = 0; i < neutralMentions.length; i++) {
    const m = neutralMentions[i];
    const date = m.publishedAt.split('T')[0];
    markdown += `### ${i + 1}. [${m.asset}] ${date}\n`;
    markdown += `**${m.title}**\n`;
    markdown += `<${m.url}>\n`;
    markdown += `판단: [ ]\n\n`;
  }
  
  const mdPath = path.join(DATA_DIR, 'review', 'neutral-review.md');
  fs.writeFileSync(mdPath, markdown);
  
  console.log(`✅ 중립 톤 언급 ${neutralMentions.length}개 추출`);
  console.log(`📄 JSON: ${outputPath}`);
  console.log(`📝 마크다운: ${mdPath}`);
}

main().catch(console.error);
