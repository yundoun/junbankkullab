# 🍯 전반꿀 연구소 (JunBanKkul Lab)

## "전인구 반대로 하면 꿀" — 진짜일까? 데이터로 검증해봤습니다

주식 커뮤니티에서 유명한 밈 **"전반꿀"**을 604개 영상 데이터로 검증하는 프로젝트입니다.

> **🍯 전반꿀 지수: 43.9%** — 동전 던지기보다 낮습니다
> 
> 커뮤니티는 "100% 역지표"라고 믿는데, 실제 데이터는 절반도 안 됩니다.

🔗 **[jbklab.vercel.app](https://jbklab.vercel.app)**

---

## 📊 현재 상태 (솔직하게)

| 지표 | 값 | 비고 |
|------|-----|------|
| **전반꿀 지수** | 43.9% | 50% 미만 = 역지표 아님 |
| **수집된 영상** | 604개 | 전인구경제연구소 전체 |
| **분석 완료** | 132개 | 아직 진행 중 |
| **기간별 지수** | 1d 43.9% / 1w 39.7% / 1m 48.2% / 3m 41% | 1개월이 가장 높음 |

**핵심 발견:**
- 커뮤니티 인식: 🔮 **"거의 100% 역지표"**
- 실제 데이터: 📊 **43.9%**
- **신화가 과장됐거나, 분석 방법이 틀렸거나. 둘 중 하나.**

---

## 🤖 만든 과정 (AI 협업)

혼자 만든 게 아니라 **AI 에이전트 2개랑 디스코드에서 대화하면서** 만들었습니다.

| 역할 | 담당 | 작업 |
|------|------|------|
| **칼 (Karl)** | 개발 에이전트 | 데이터 수집, 분석 파이프라인, 배포 |
| **유키 (Yuki)** | 디자인 에이전트 | UI/UX 피드백, 레퍼런스 제안 |
| **Doun** | 인간 | 방향 설정, 의사결정 |

디스코드 채널에서 셋이 대화하면서:
1. YouTube API로 영상 메타데이터 수집
2. GPT-4o-mini로 종목/톤 분석
3. yfinance로 실제 주가 검증
4. 커뮤니티 반응 크롤링 (에펨코리아, 디시, 나무위키)

---

## 🔬 어떻게 동작하나요?

```
📺 YouTube API     →  영상 수집 (604개)
        ↓
🤖 GPT-4o-mini    →  종목/톤 추출 (상승/하락/중립)
        ↓
📊 yfinance       →  실제 주가 조회
        ↓
⚖️ 비교 분석      →  1일/1주/1개월/3개월 후 결과
        ↓
🍯 전반꿀 지수    →  역지표 적중률 계산
```

**분석 기간:**
- 1일 후: 단기 (43.9%)
- 1주 후: 스윙 (39.7%)
- **1개월 후: 중기 (48.2%)** ← 가장 높음
- 3개월 후: 장기 (41%)

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Database** | Supabase (PostgreSQL) |
| **AI** | OpenAI GPT-4o-mini |
| **Data** | YouTube Data API, yfinance |
| **Deploy** | Vercel |
| **CI/CD** | GitHub Actions (시간당 자동 수집) |

---

## 🚀 로컬에서 실행하기

```bash
# 클론
git clone https://github.com/yundoun/junbankkullab.git
cd junbankkullab

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local

# 개발 서버 실행
pnpm dev
```

### 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
```

---

## 🙏 피드백 환영

아직 실험 단계입니다:

- 분석 방법론 괜찮은가요?
- 43.9%가 "역지표 아님"인 건가요, 표본이 부족한 건가요?
- 더 추가하면 좋을 기능?

**이슈, PR 모두 환영합니다!**

---

## ⚠️ 면책조항

**이 프로젝트는 엔터테인먼트 및 교육 목적입니다.**

- ❌ 투자 조언이 아닙니다
- ❌ 실제 투자 결정에 사용하지 마세요
- ✅ 밈을 데이터로 검증하는 실험입니다

---

## 📜 라이선스

MIT License

---

<div align="center">

**"커뮤니티는 100%라고 믿는데, 데이터는 43.9%라고 말한다."**

[🔗 Live Demo](https://jbklab.vercel.app) · [🐛 Report Bug](https://github.com/yundoun/junbankkullab/issues)

</div>
