# 전반꿀 연구소 - Design System v2

## 🎯 목표

**"데이터를 보여주는 대시보드" → "참여하고 싶은 게임판"**

- 조회형 → 참여형 전환
- Bento Grid 레이아웃
- 게이미피케이션 준비된 컴포넌트 시스템
- 일관된 디자인 토큰

---

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3
- **Components**: shadcn/ui (Radix UI 기반)
- **Icons**: Lucide React
- **Charts**: Recharts (유지)
- **Animation**: Tailwind + CSS Transitions

---

## 🎨 브랜드 컬러

### Primary - Honey (꿀)
전반꿀의 핵심 아이덴티티. CTA, 강조, 브랜드 요소에 사용.

```
honey-400: #fcd535 (Primary)
honey-300: #ffe566 (Hover)
honey-500: #e5c100 (Pressed)
honey-950: #1a1400 (Background tint)
```

### Status Colors
투자 방향성을 나타내는 시그널 컬러.

```
bullish (상승):  #0ecb81
bearish (하락):  #f6465d
pending (대기):  #fcd535
```

### Neutral (Surface)
다크 테마 기반. Binance 스타일 유지.

```
gray-950: #0b0e11 (Background)
gray-900: #12161c (Surface)
gray-850: #1a1f26 (Elevated)
gray-800: #242a33 (Overlay)
gray-700: #2b3139 (Border)
gray-500: #5e6673 (Muted text)
gray-400: #848e9c (Secondary text)
gray-100: #eaecef (Primary text)
```

---

## 📐 토큰 구조

### 1. Primitives (원시 값)
절대적인 값. 직접 사용 X.

### 2. Semantic (의미 기반)
용도에 따른 매핑. 컴포넌트에서 사용.

```css
--background: var(--gray-950);
--foreground: var(--gray-100);
--card: var(--gray-900);
--card-foreground: var(--gray-100);
--primary: var(--honey-400);
--primary-foreground: var(--gray-950);
--secondary: var(--gray-800);
--secondary-foreground: var(--gray-100);
--muted: var(--gray-800);
--muted-foreground: var(--gray-500);
--accent: var(--honey-400);
--accent-foreground: var(--gray-950);
--destructive: var(--bearish);
--border: var(--gray-700);
--ring: var(--honey-400);
```

### 3. Component (컴포넌트별)
특정 컴포넌트 전용 토큰.

---

## 🧩 컴포넌트 계층

### Base (shadcn/ui)
```
Button, Badge, Card, Input, Dialog, 
Dropdown, Tabs, Tooltip, Avatar, Progress
```

### Domain (전반꿀 전용)
```
BentoGrid      - 그리드 레이아웃 시스템
BentoCard      - 개별 카드 (다양한 사이즈)
VoteCard       - 투표 카드 (상승/하락)
HoneyGauge     - 꿀지수 게이지
PredictionCard - 예측 결과 카드
StatusBadge    - 상승/하락/대기 뱃지
LeaderboardRow - 리더보드 행 (향후)
TokenDisplay   - 꿀 토큰 표시 (향후)
```

---

## 📱 Bento Grid 시스템

### 그리드 정의
```
Desktop (lg+):  12 columns
Tablet (md):    8 columns  
Mobile (sm):    4 columns

Gap: 16px (space-4)
```

### 카드 사이즈
```
sm:   1x1 (span-3 / span-4)
md:   2x1 (span-6 / span-4)
lg:   2x2 (span-6 / span-8)
xl:   3x1 (span-9 / full)
full: 4x1 (span-12 / full)
```

### 레이아웃 예시 (Desktop)
```
┌─────────────────┬─────────────────┐
│                 │                 │
│   VoteCard      │   HoneyGauge    │
│   (lg: 2x2)     │   (lg: 2x2)     │
│                 │                 │
├────────┬────────┼────────┬────────┤
│ Stat   │ Stat   │ Stat   │ Stat   │
│ (sm)   │ (sm)   │ (sm)   │ (sm)   │
├────────┴────────┴────────┴────────┤
│                                   │
│      Predictions (full)           │
│                                   │
└───────────────────────────────────┘
```

---

## 🎮 인터랙션 패턴

### Hover States
- Scale: `hover:scale-[1.02]`
- Glow: `hover:shadow-[0_0_20px_rgba(252,213,53,0.3)]`
- Border: `hover:border-honey-400`

### Active/Pressed
- Scale: `active:scale-[0.98]`
- Opacity: `active:opacity-90`

### Transitions
```css
transition-all duration-200 ease-out
```

### 투표 버튼 특수 효과
```
상승 선택: green glow + scale up
하락 선택: red glow + scale up
미선택:   subtle border
```

---

## 📁 파일 구조

```
src/
├── app/
│   ├── globals.css          # Tailwind + 토큰
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── domain/              # 전반꿀 전용 컴포넌트
│       ├── bento-grid.tsx
│       ├── bento-card.tsx
│       ├── vote-card.tsx
│       ├── honey-gauge.tsx
│       ├── prediction-card.tsx
│       └── status-badge.tsx
├── lib/
│   └── utils.ts             # cn() 등 유틸
└── styles/
    └── tokens.css           # 디자인 토큰 (선택적)
```

---

## ✅ Phase 1 체크리스트

### Setup
- [ ] shadcn/ui 초기화
- [ ] 디자인 토큰 설정 (globals.css)
- [ ] Tailwind config 확장
- [ ] 기본 UI 컴포넌트 추가

### Base Components
- [ ] Button (variants: default, outline, ghost, vote-up, vote-down)
- [ ] Badge (variants: bullish, bearish, pending, honey)
- [ ] Card (기본 카드)

### Domain Components  
- [ ] BentoGrid + BentoCard
- [ ] VoteCard (투표 UI)
- [ ] HoneyGauge (게이지 차트)
- [ ] PredictionCard (예측 카드)
- [ ] StatusBadge

### Page
- [ ] 새 레이아웃 적용
- [ ] Hero 섹션 (VoteCard + HoneyGauge)
- [ ] Stats 섹션 (Bento 작은 카드들)
- [ ] Predictions 섹션 (카드 리스트)

---

## 🚀 향후 확장 (Phase 2+)

- 인증 시스템 (NextAuth)
- 토큰 시스템 UI (꿀 표시, 획득 애니메이션)
- 리더보드 컴포넌트
- 뱃지 시스템 UI
- 알림/토스트 시스템
- 다크/라이트 테마 토글 (옵션)

---

*Last updated: 2025-02-05*
