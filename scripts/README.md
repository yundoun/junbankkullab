# 🛠️ Scripts Directory

전반꿀 연구소 데이터 수집 및 분석 스크립트.

---

## 📁 현재 파일 목록

| 파일 | 용도 | 실행 방법 |
|------|------|----------|
| `collect.ts` | 30일 영상 수집 + 분석 | `npx tsx scripts/collect.ts` |
| `hybrid-analysis.ts` | 하이브리드 분석 | `npx tsx scripts/hybrid-analysis.ts` |
| `extract-neutral.ts` | 검토 대기 추출 | `npx tsx scripts/extract-neutral.ts` |
| `count-valid.ts` | 유효 예측 카운트 | `npx tsx scripts/count-valid.ts` |
| `market_data.py` | 시장 데이터 조회 | Python 내부 호출용 |
| `get_direction.py` | 가격 방향 계산 | Python 내부 호출용 |

### 📂 `legacy/` (레거시)

더 이상 사용하지 않는 스크립트들:
- `collect-2026.ts` - 2026년 전체 수집 (collect.ts로 통합)
- `analyze-2026.ts` - 2026년 분석 (hybrid-analysis.ts로 대체)
- `final-analysis.ts` - 6종목 정밀 분석 (hybrid-analysis.ts로 대체)
- `restructure-data.ts` - 구버전 데이터 구조 변환 (완료)
- `migrate-data-structure.ts` - predictions.json → analyzed.json 마이그레이션 (완료)

---

## 📝 상세 설명

### `collect.ts`
> 🎯 **메인 수집 스크립트** - GitHub Actions에서 사용

**역할**:
1. YouTube Data API로 최근 30일 영상 수집
2. 영상 제목에서 종목 언급 + 감성 분석
3. yfinance/Binance API로 24시간 후 시장 데이터 조회
4. 예측 적중 여부 계산 (꿀지수)
5. `data/{YYYY}/{MM}/` 폴더에 저장:
   - `videos.json` - 전체 영상
   - `analyzed.json` - 분석 완료 (톤+시장결과)
   - `unanalyzed.json` - 톤 미확정
   - `excluded.json` - 제외 항목

**사용처**: 
- GitHub Actions 자동 수집 (`.github/workflows/collect.yml`)
- 수동 실행: `npx tsx scripts/collect.ts`

**환경변수**:
- `YOUTUBE_API_KEY`: YouTube Data API 키 (.env.local)

---

### `hybrid-analysis.ts` ⭐
> 🧪 **핵심 분석 엔진** - 하이브리드 방식 역지표 계산

**역할**:
1. 모든 월별 데이터 로드 (`data/{YYYY}/{MM}/videos.json`)
2. 종목 언급 + 톤(긍정/부정) 감지
3. `market_data.py` 호출로 24시간 후 방향 확인
4. 역지표 적중 여부 계산
5. 결과 저장:
   - `data/stats/hybrid-analysis.json` (상세 분석)
   - `data/stats/overall.json` (월별 타임라인)

**사용처**:
- `src/app/api/stats/route.ts` - 프론트엔드 API
- GitHub Actions 수집 후 자동 실행

**분석 로직**:
```
부정적 톤 + 실제 상승 = 🍯 (역지표 적중)
긍정적 톤 + 실제 하락 = 🍯 (역지표 적중)
그 외 = 일반 적중 또는 미스
```

---

### `extract-neutral.ts`
> 🔍 **검토 항목 추출** - 자동 분류 실패 케이스

**역할**:
1. 모든 영상에서 종목 언급 탐지
2. 톤이 "neutral"로 판정된 항목 추출
3. 사람이 수동 레이블링할 수 있도록 저장:
   - `data/review/neutral-mentions.json` (JSON)
   - `data/review/neutral-review.md` (마크다운)

**사용처**: 주기적으로 실행 → Doun이 검토 → manual-labels.json 작성

---

### `count-valid.ts`
> 📊 **통계 집계** - 유효 예측 수 카운트

**역할**:
- 전체 데이터에서 유효한 예측 개수 집계
- 종목별/월별 분포 확인

**사용처**: 데이터 현황 파악용

---

### `market_data.py`
> 📈 **시장 데이터 조회** - Python 유틸리티

**역할**:
- yfinance로 주식/지수 가격 조회
- 특정 시점의 가격 및 24시간 후 가격 반환

**사용처**: TypeScript 스크립트에서 `execSync`로 호출
```typescript
const result = execSync(`python3 scripts/market_data.py ${symbol} ${date}`)
```

---

### `get_direction.py`
> ⬆️⬇️ **방향 계산** - 가격 변동 방향 판정

**역할**:
- 두 가격 비교하여 방향 반환 (up/down/flat)
- 변화율 계산

**사용처**: `hybrid-analysis.ts`에서 호출

---

## 🔄 실행 순서 (자동 수집)

GitHub Actions (`.github/workflows/collect.yml`):

```bash
# 1. 최근 30일 영상 수집
npx tsx scripts/collect.ts

# 2. 하이브리드 분석 업데이트
npx tsx scripts/hybrid-analysis.ts

# 3. Git 커밋/푸시
git add data/
git commit -m "chore: 자동 수집"
git push
```

---

## 🧪 로컬 테스트

```bash
# 환경변수 설정
cp .env.example .env.local
# YOUTUBE_API_KEY 입력

# venv 생성 (Python 의존성)
python3 -m venv venv
source venv/bin/activate
pip install yfinance

# 수집 테스트
npx tsx scripts/collect.ts

# 분석 테스트
npx tsx scripts/hybrid-analysis.ts
```

---

## ⚠️ 주의사항

1. **API 할당량**: YouTube Data API는 일일 할당량 제한 있음
2. **시장 데이터 지연**: yfinance는 15분 지연 데이터
3. **Python 의존성**: `venv/`에 yfinance 설치 필요
4. **타임존**: 모든 시간은 UTC 기준, KST 변환 필요
