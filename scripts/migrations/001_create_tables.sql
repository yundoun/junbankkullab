-- 전반꿀 연구소 Supabase 마이그레이션
-- 실행: Supabase Dashboard → SQL Editor

-- videos: 모든 영상
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'unanalyzed', -- 'analyzed' | 'unanalyzed' | 'excluded'
  exclude_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- analyses: LLM 분석 결과 (video당 여러 종목 가능)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  ticker TEXT,
  matched_text TEXT,
  confidence FLOAT,
  asset_reasoning TEXT,
  tone TEXT, -- 'positive' | 'negative' | 'neutral'
  tone_keywords TEXT[],
  tone_reasoning TEXT,
  llm_model TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, asset)
);

-- market_data: 시장 데이터 + 판정
CREATE TABLE market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  trading_date DATE NOT NULL,
  previous_close FLOAT,
  close_price FLOAT,
  price_change FLOAT,
  direction TEXT, -- 'up' | 'down'
  predicted_direction TEXT, -- 'bullish' | 'bearish'
  is_honey BOOLEAN,
  judgment_reasoning TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- RLS 활성화
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (공개)
CREATE POLICY "videos_read" ON videos FOR SELECT USING (true);
CREATE POLICY "analyses_read" ON analyses FOR SELECT USING (true);
CREATE POLICY "market_data_read" ON market_data FOR SELECT USING (true);

-- 서비스 키로만 쓰기 가능 (INSERT, UPDATE, DELETE)
CREATE POLICY "videos_insert_service" ON videos FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "videos_update_service" ON videos FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "videos_delete_service" ON videos FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "analyses_insert_service" ON analyses FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "analyses_update_service" ON analyses FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "analyses_delete_service" ON analyses FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "market_data_insert_service" ON market_data FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "market_data_update_service" ON market_data FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "market_data_delete_service" ON market_data FOR DELETE USING (auth.role() = 'service_role');

-- 인덱스
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_analyses_video ON analyses(video_id);
CREATE INDEX idx_analyses_asset ON analyses(asset);
CREATE INDEX idx_market_data_honey ON market_data(is_honey) WHERE is_honey = true;
CREATE INDEX idx_market_data_trading_date ON market_data(trading_date DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
