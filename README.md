# 전반꿀 연구소 (JunBanKkul Lab)

> "전인구 반대로 하면 꿀" — 과연 사실일까?

전인구경제연구소 유튜브 채널의 예측과 실제 시장 움직임의 역상관관계를 검증하는 데이터 기반 웹사이트.

## 🎯 What is this?

주식/코인 커뮤니티에서 유명한 밈 "전반꿀"을 데이터로 검증합니다:
- 전인구경제연구소의 영상 제목에서 시장 예측 방향 추출
- 실제 시장 데이터와 비교
- 역상관관계(전반꿀 지수) 통계 산출

## 📊 Features

- **전반꿀 지수**: 전체 역상관 확률
- **종목별 분석**: 비트코인, 코스피, 나스닥, 개별 종목
- **타임라인**: 최신 영상 예측 vs 실제 결과
- **그래프 시각화**: 시간에 따른 전반꿀 지수 변화

## 🛠 Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Python (분석)
- **Database**: SQLite → PostgreSQL
- **Data Sources**:
  - YouTube Data API (영상 메타데이터)
  - yfinance (주식/지수)
  - Binance API (암호화폐)

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your YouTube API key

# Run development server
pnpm dev
```

## 📁 Project Structure

```
junbankkullab/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   │   ├── youtube.ts    # YouTube API client
│   │   ├── market.ts     # Market data fetching
│   │   └── analyzer.ts   # Sentiment analysis
│   └── types/            # TypeScript types
├── scripts/              # Data collection scripts
├── data/                 # Collected data (gitignored)
└── docs/                 # Documentation
```

## ⚠️ Disclaimer

이 프로젝트는 순수하게 엔터테인먼트 및 교육 목적입니다. 투자 조언이 아닙니다.
밈을 데이터로 검증하는 실험일 뿐, 실제 투자 결정에 사용하지 마세요.

## 📜 License

MIT

---

*"Talk is cheap. Show me the data."*
