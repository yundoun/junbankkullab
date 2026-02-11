# 전반꿀 연구소 (JunBanKkul Lab)

> "전인구 반대로 하면 꿀" — 과연 사실일까?

전인구경제연구소 유튜브 채널의 시장 예측을 분석하여 **역지표 유효성**을 데이터로 검증하는 웹사이트입니다.

🔗 **Live**: https://jbklab.vercel.app/

---

## 프로젝트 개요

주식/코인 커뮤니티에서 유명한 밈 "전반꿀"을 실제 데이터로 검증합니다:

1. **예측 수집**: 전인구경제연구소 영상 제목에서 시장 예측 방향 추출
2. **결과 비교**: 예측 후 실제 시장 움직임과 비교
3. **지수 산출**: 역상관관계 (전반꿀 지수) 통계 계산

## 주요 기능

- **전반꿀 지수**: 전체 역상관 확률 (50% = 무작위, 높을수록 역지표 유효)
- **종목별 분석**: 비트코인, 코스피, 나스닥, 개별 종목별 역상관 지수
- **예측 타임라인**: 최신 영상 예측 vs 실제 결과 기록
- **커뮤니티 투표**: 사용자 예측 참여 (다음 방향 예측)
- **차트 시각화**: 시간에 따른 전반꿀 지수 추이

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Data | YouTube Data API, yfinance (Python) |
| Deploy | Vercel |

## 시작하기

### 요구사항

- Node.js 18+
- pnpm (권장) 또는 npm
- Python 3.9+ (데이터 수집용)

### 설치

```bash
# 저장소 클론
git clone https://github.com/karl-ai-dev/junbankkullab.git
cd junbankkullab

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local에 YOUTUBE_API_KEY 추가

# 개발 서버 실행
pnpm dev
```

### 주요 명령어

```bash
pnpm dev        # 개발 서버 (localhost:3000)
pnpm build      # 프로덕션 빌드
pnpm start      # 프로덕션 서버
pnpm lint       # ESLint 검사
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router (라우팅)
│   └── api/                # API Routes
├── features/               # 기능별 모듈
│   ├── predictions/        # 예측 분석
│   ├── honey-index/        # 꿀지수 통계/차트
│   ├── voting/             # 투표 시스템
│   └── assets/             # 종목별 통계
├── shared/                 # 공용 모듈
│   ├── components/         # 공통 UI 컴포넌트
│   ├── lib/                # 유틸, API 클라이언트
│   └── types/              # 공통 타입 정의
└── styles/                 # 글로벌 스타일
```

자세한 아키텍처는 [ARCHITECTURE.md](./ARCHITECTURE.md) 참조.

## 기여하기

기여를 환영합니다! [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조해주세요.

## 면책조항

⚠️ **이 프로젝트는 순수하게 엔터테인먼트 및 교육 목적입니다.**

- 투자 조언이 아닙니다
- 밈을 데이터로 검증하는 실험일 뿐입니다
- 실제 투자 결정에 사용하지 마세요

## 라이선스

MIT

---

*"Talk is cheap. Show me the data."*
