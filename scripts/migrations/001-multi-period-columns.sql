-- Migration: Add multi-period columns to market_data
-- Run this in Supabase SQL Editor

-- 1주 (5 거래일) 컬럼
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_1w DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_change_1w DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS direction_1w VARCHAR(10);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS is_honey_1w BOOLEAN;
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS trading_date_1w DATE;

-- 1개월 (20 거래일) 컬럼
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_1m DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_change_1m DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS direction_1m VARCHAR(10);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS is_honey_1m BOOLEAN;
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS trading_date_1m DATE;

-- 3개월 (60 거래일) 컬럼
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_3m DECIMAL(10,2);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS price_change_3m DECIMAL(10,4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS direction_3m VARCHAR(10);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS is_honey_3m BOOLEAN;
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS trading_date_3m DATE;

-- 인덱스 (통계 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_market_data_is_honey_1w ON market_data(is_honey_1w) WHERE is_honey_1w IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_data_is_honey_1m ON market_data(is_honey_1m) WHERE is_honey_1m IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_data_is_honey_3m ON market_data(is_honey_3m) WHERE is_honey_3m IS NOT NULL;
