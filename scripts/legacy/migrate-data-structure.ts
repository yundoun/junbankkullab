#!/usr/bin/env npx tsx
/**
 * 데이터 구조 마이그레이션
 * predictions.json → analyzed.json, unanalyzed.json, excluded.json
 */
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');

// 모든 월별 폴더 찾기
function findMonthlyDirs(): string[] {
  const dirs: string[] = [];
  const years = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}$/.test(f));
  
  for (const year of years) {
    const yearDir = path.join(DATA_DIR, year);
    const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));
    
    for (const month of months) {
      dirs.push(path.join(yearDir, month));
    }
  }
  
  return dirs;
}

async function main() {
  console.log('🔄 데이터 구조 마이그레이션 시작...\n');
  
  const monthlyDirs = findMonthlyDirs();
  console.log(`📁 월별 폴더 ${monthlyDirs.length}개 발견\n`);
  
  for (const dir of monthlyDirs) {
    const predictionsPath = path.join(dir, 'predictions.json');
    const analyzedPath = path.join(dir, 'analyzed.json');
    const unanalyzedPath = path.join(dir, 'unanalyzed.json');
    const excludedPath = path.join(dir, 'excluded.json');
    
    const relPath = path.relative(DATA_DIR, dir);
    
    // predictions.json 존재 확인
    if (fs.existsSync(predictionsPath)) {
      // predictions.json → analyzed.json
      const content = fs.readFileSync(predictionsPath, 'utf-8');
      fs.writeFileSync(analyzedPath, content);
      console.log(`✅ ${relPath}/predictions.json → analyzed.json`);
      
      // predictions.json 삭제
      fs.unlinkSync(predictionsPath);
      console.log(`🗑️  ${relPath}/predictions.json 삭제`);
    } else {
      // analyzed.json이 없으면 빈 배열로 생성
      if (!fs.existsSync(analyzedPath)) {
        fs.writeFileSync(analyzedPath, '[]');
        console.log(`📄 ${relPath}/analyzed.json 생성 (빈 배열)`);
      }
    }
    
    // unanalyzed.json 생성 (없으면)
    if (!fs.existsSync(unanalyzedPath)) {
      fs.writeFileSync(unanalyzedPath, '[]');
      console.log(`📄 ${relPath}/unanalyzed.json 생성 (빈 배열)`);
    }
    
    // excluded.json 생성 (없으면)
    if (!fs.existsSync(excludedPath)) {
      fs.writeFileSync(excludedPath, '[]');
      console.log(`📄 ${relPath}/excluded.json 생성 (빈 배열)`);
    }
    
    console.log('');
  }
  
  console.log('✨ 마이그레이션 완료!');
}

main().catch(console.error);
