# 복합 기간 전반꿀 지수 설계

## 배경
- 현재: 영상 업로드 후 **다음 거래일** 기준으로 역지표 판단
- 문제: 전인구 예측이 중장기 관점일 수 있어 단기 판단 부적절
- 해결: 1주/1개월/3개월 기간별 복합 지표

## 스키마 변경

### market_data 테이블 확장

```sql
-- 기존 컬럼 (1일 기준)
-- trading_date, previous_close, close_price, price_change, direction, is_honey

-- 추가 컬럼 (1주 기준 - 5 거래일)
ALTER TABLE market_data ADD COLUMN price_1w DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN price_change_1w DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN direction_1w VARCHAR(10);
ALTER TABLE market_data ADD COLUMN is_honey_1w BOOLEAN;
ALTER TABLE market_data ADD COLUMN trading_date_1w DATE;

-- 추가 컬럼 (1개월 기준 - 20 거래일)
ALTER TABLE market_data ADD COLUMN price_1m DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN price_change_1m DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN direction_1m VARCHAR(10);
ALTER TABLE market_data ADD COLUMN is_honey_1m BOOLEAN;
ALTER TABLE market_data ADD COLUMN trading_date_1m DATE;

-- 추가 컬럼 (3개월 기준 - 60 거래일)
ALTER TABLE market_data ADD COLUMN price_3m DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN price_change_3m DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN direction_3m VARCHAR(10);
ALTER TABLE market_data ADD COLUMN is_honey_3m BOOLEAN;
ALTER TABLE market_data ADD COLUMN trading_date_3m DATE;
```

## API 응답 구조

```typescript
interface HoneyIndexResponse {
  honeyIndex: {
    '1d': { value: number; total: number; honey: number };
    '1w': { value: number; total: number; honey: number };
    '1m': { value: number; total: number; honey: number };
    '3m': { value: number; total: number; honey: number };
  };
  // 기본 선택 기간
  defaultPeriod: '1m';
}
```

## 분석 로직 변경

### analyze-v3.ts 수정

```typescript
interface MarketDataMultiPeriod {
  // 기존 (1일)
  tradingDate: string;
  previousClose: number;
  closePrice: number;
  priceChange: number;
  direction: 'up' | 'down' | 'flat';
  
  // 1주
  price1w?: number;
  priceChange1w?: number;
  direction1w?: 'up' | 'down' | 'flat';
  tradingDate1w?: string;
  
  // 1개월
  price1m?: number;
  priceChange1m?: number;
  direction1m?: 'up' | 'down' | 'flat';
  tradingDate1m?: string;
  
  // 3개월
  price3m?: number;
  priceChange3m?: number;
  direction3m?: 'up' | 'down' | 'flat';
  tradingDate3m?: string;
}
```

### yfinance 호출 수정

```python
# 기존: 다음 거래일만 조회
# 변경: 영상 날짜 + 60 거래일 (3개월) 데이터 조회

import yfinance as yf
import pandas_market_calendars as mcal

def get_multi_period_prices(ticker, video_date):
    # 60 거래일 후까지의 데이터 필요
    end_date = video_date + timedelta(days=90)  # 여유있게
    data = yf.download(ticker, start=video_date, end=end_date)
    
    # 거래일 계산
    nyse = mcal.get_calendar('NYSE')  # 또는 'XKRX' for 한국
    trading_days = nyse.valid_days(start_date=video_date, end_date=end_date)
    
    return {
        '1d': data.iloc[1] if len(data) > 1 else None,   # 다음 거래일
        '1w': data.iloc[5] if len(data) > 5 else None,   # 5 거래일 후
        '1m': data.iloc[20] if len(data) > 20 else None, # 20 거래일 후
        '3m': data.iloc[60] if len(data) > 60 else None, # 60 거래일 후
    }
```

## 백필 전략

1. 기존 데이터 마이그레이션 필요
2. 옵션 A: 전체 재분석 (시간 오래 걸림)
3. 옵션 B: 새 컬럼만 채우는 별도 스크립트

## 구현 순서

1. [x] 설계 문서 작성
2. [ ] Supabase 스키마 마이그레이션
3. [ ] analyze-v3.ts 수정 (멀티 기간 데이터 수집)
4. [ ] API route 수정 (기간별 통계 계산)
5. [ ] 백필 스크립트 작성 & 실행
6. [ ] UI 컴포넌트 (유키)

## 주의사항

- 3개월 전 영상만 3개월 지표 계산 가능
- 각 기간별 샘플 수 상이 → UI에 표시 필수
- 한국 주식 vs 미국 주식 거래일 다름 → 캘린더 분기 처리
