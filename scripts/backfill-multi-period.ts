#!/usr/bin/env npx tsx
/**
 * 백필 스크립트: 기존 market_data에 1w/1m/3m 데이터 추가
 * 
 * 사용법: npx tsx scripts/backfill-multi-period.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// .env.local 로드
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MultiPeriodData {
  '1d'?: { date: string; close: number; change: number; direction: string; available: boolean };
  '1w'?: { date: string; close: number; change: number; direction: string; available: boolean };
  '1m'?: { date: string; close: number; change: number; direction: string; available: boolean };
  '3m'?: { date: string; close: number; change: number; direction: string; available: boolean };
  baseline?: { date: string; close: number };
  error?: string;
}

function getMultiPeriodPrices(asset: string, publishedAt: string): MultiPeriodData | null {
  try {
    const date = publishedAt.split('T')[0];
    
    const projectDir = path.join(__dirname, '..');
    const pythonCmd = fs.existsSync(path.join(projectDir, 'venv'))
      ? `source venv/bin/activate && python3 scripts/market_data.py multi ${asset} ${date}`
      : `python3 scripts/market_data.py multi ${asset} ${date}`;
    
    const result = execSync(
      `cd "${projectDir}" && ${pythonCmd}`,
      { encoding: 'utf-8', timeout: 60000, shell: '/bin/bash' }
    );
    
    const data = JSON.parse(result.trim());
    
    if (data.error) {
      return null;
    }
    
    return data;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('🔄 백필 시작: 기존 market_data에 1w/1m/3m 데이터 추가\n');

  // 1. 백필 대상 조회 (1w 데이터가 없는 레코드)
  const { data: targets, error } = await supabase
    .from('market_data')
    .select(`
      id,
      analysis_id,
      predicted_direction,
      analyses!inner (
        asset,
        videos!inner (
          published_at
        )
      )
    `)
    .is('is_honey_1w', null)
    .limit(500);

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📊 백필 대상: ${targets?.length || 0}개\n`);

  if (!targets || targets.length === 0) {
    console.log('✅ 백필할 데이터 없음');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    const analysis = target.analyses as any;
    const asset = analysis.asset;
    const publishedAt = analysis.videos.published_at;
    const predictedDir = target.predicted_direction as 'bullish' | 'bearish';

    process.stdout.write(`  ${asset} (${publishedAt.split('T')[0]})... `);

    const multiData = getMultiPeriodPrices(asset, publishedAt);

    if (!multiData) {
      console.log('❌ 데이터 없음');
      failed++;
      continue;
    }

    // 역지표 판정 함수
    const calcIsHoney = (actualDir: string) => {
      const actual = actualDir === 'up' ? 'bullish' : actualDir === 'down' ? 'bearish' : 'flat';
      return (predictedDir === 'bullish' && actual === 'bearish') ||
             (predictedDir === 'bearish' && actual === 'bullish');
    };

    const updateData: Record<string, unknown> = {};

    if (multiData['1w']?.available) {
      updateData.price_1w = multiData['1w'].close;
      updateData.price_change_1w = multiData['1w'].change;
      updateData.direction_1w = multiData['1w'].direction;
      updateData.is_honey_1w = calcIsHoney(multiData['1w'].direction);
      updateData.trading_date_1w = multiData['1w'].date;
    }

    if (multiData['1m']?.available) {
      updateData.price_1m = multiData['1m'].close;
      updateData.price_change_1m = multiData['1m'].change;
      updateData.direction_1m = multiData['1m'].direction;
      updateData.is_honey_1m = calcIsHoney(multiData['1m'].direction);
      updateData.trading_date_1m = multiData['1m'].date;
    }

    if (multiData['3m']?.available) {
      updateData.price_3m = multiData['3m'].close;
      updateData.price_change_3m = multiData['3m'].change;
      updateData.direction_3m = multiData['3m'].direction;
      updateData.is_honey_3m = calcIsHoney(multiData['3m'].direction);
      updateData.trading_date_3m = multiData['3m'].date;
    }

    if (Object.keys(updateData).length === 0) {
      console.log('⏭️ 스킵 (데이터 부족)');
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('market_data')
      .update(updateData)
      .eq('id', target.id);

    if (updateError) {
      console.log(`❌ 업데이트 실패: ${updateError.message}`);
      failed++;
    } else {
      const periods = [];
      if (updateData.is_honey_1w !== undefined) periods.push('1w');
      if (updateData.is_honey_1m !== undefined) periods.push('1m');
      if (updateData.is_honey_3m !== undefined) periods.push('3m');
      console.log(`✅ ${periods.join('/')}`);
      updated++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n📊 백필 완료:');
  console.log(`  ✅ 업데이트: ${updated}`);
  console.log(`  ⏭️ 스킵: ${skipped}`);
  console.log(`  ❌ 실패: ${failed}`);
}

main().catch(console.error);
