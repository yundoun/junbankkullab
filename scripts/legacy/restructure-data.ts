/**
 * 데이터 구조 재정리 스크립트
 * 기존 데이터를 옵션3 구조로 변환
 */

import * as fs from 'fs/promises'

async function main() {
  console.log('📁 데이터 구조 재정리 시작...\n')

  // 1. 2026년 1월 데이터 정리
  console.log('📅 2026/01 정리...')
  
  // videos-2026-raw.json에서 1월 영상만 추출
  const rawVideos2026 = JSON.parse(await fs.readFile('./data/videos-2026-raw.json', 'utf-8'))
  const jan2026Videos = rawVideos2026.filter((v: any) => {
    const date = new Date(v.publishedAt)
    return date.getFullYear() === 2026 && date.getMonth() === 0 // January
  })
  
  // 설명 제외하고 저장
  const cleanVideos = jan2026Videos.map((v: any) => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    publishedAt: v.publishedAt,
  }))
  
  await fs.mkdir('./data/2026/01', { recursive: true })
  await fs.writeFile('./data/2026/01/videos.json', JSON.stringify(cleanVideos, null, 2))
  console.log(`   ✓ videos.json: ${cleanVideos.length}개 영상`)
  
  // predictions.json - honey-index-final.json에서 1월 데이터만
  const finalData = JSON.parse(await fs.readFile('./data/honey-index-final.json', 'utf-8'))
  const jan2026Preds = finalData.predictions.filter((p: any) => {
    const date = new Date(p.publishedAt)
    return date.getFullYear() === 2026 && date.getMonth() === 0
  })
  
  const jan2026Stats = {
    totalVideos: cleanVideos.length,
    validPredictions: jan2026Preds.length,
    honeyCount: jan2026Preds.filter((p: any) => p.isHoney).length,
    honeyIndex: 0,
    assetStats: {} as Record<string, { total: number, honey: number }>
  }
  
  for (const p of jan2026Preds) {
    if (!jan2026Stats.assetStats[p.asset]) {
      jan2026Stats.assetStats[p.asset] = { total: 0, honey: 0 }
    }
    jan2026Stats.assetStats[p.asset].total++
    if (p.isHoney) jan2026Stats.assetStats[p.asset].honey++
  }
  
  jan2026Stats.honeyIndex = jan2026Stats.validPredictions > 0 
    ? Math.round((jan2026Stats.honeyCount / jan2026Stats.validPredictions) * 1000) / 10
    : 0
  
  await fs.writeFile('./data/2026/01/predictions.json', JSON.stringify({
    period: { year: 2026, month: 1 },
    stats: jan2026Stats,
    predictions: jan2026Preds,
  }, null, 2))
  console.log(`   ✓ predictions.json: ${jan2026Preds.length}개 예측, 꿀지수 ${jan2026Stats.honeyIndex}%`)

  // 2. 2025년 12월 데이터 정리
  console.log('📅 2025/12 정리...')
  
  const dec2025Data = JSON.parse(await fs.readFile('./data/honey-index-2025-12-01-to-2025-12-31.json', 'utf-8'))
  
  await fs.mkdir('./data/2025/12', { recursive: true })
  
  // predictions만 있음 (videos 없음 - 나중에 수집 필요)
  const dec2025Stats = {
    totalVideos: dec2025Data.stats.totalVideos,
    validPredictions: dec2025Data.stats.predictionsWithData,
    honeyCount: dec2025Data.stats.honeyCount,
    honeyIndex: dec2025Data.stats.honeyIndex,
    assetStats: dec2025Data.assetStats,
  }
  
  await fs.writeFile('./data/2025/12/predictions.json', JSON.stringify({
    period: { year: 2025, month: 12 },
    stats: dec2025Stats,
    predictions: dec2025Data.predictions,
  }, null, 2))
  console.log(`   ✓ predictions.json: ${dec2025Data.predictions.length}개 예측, 꿀지수 ${dec2025Stats.honeyIndex}%`)

  // 3. 전체 통계 생성
  console.log('📊 stats/overall.json 생성...')
  
  await fs.mkdir('./data/stats', { recursive: true })
  
  const allPredictions = [...jan2026Preds, ...dec2025Data.predictions]
  const totalHoney = allPredictions.filter((p: any) => p.isHoney).length
  const overallHoneyIndex = allPredictions.length > 0
    ? Math.round((totalHoney / allPredictions.length) * 1000) / 10
    : 0
  
  // 종목별 전체 통계
  const overallAssetStats: Record<string, { total: number, honey: number, honeyIndex: number }> = {}
  for (const p of allPredictions) {
    if (!overallAssetStats[p.asset]) {
      overallAssetStats[p.asset] = { total: 0, honey: 0, honeyIndex: 0 }
    }
    overallAssetStats[p.asset].total++
    if (p.isHoney) overallAssetStats[p.asset].honey++
  }
  
  for (const asset of Object.keys(overallAssetStats)) {
    const s = overallAssetStats[asset]
    s.honeyIndex = s.total > 0 ? Math.round((s.honey / s.total) * 1000) / 10 : 0
  }
  
  const overall = {
    updatedAt: new Date().toISOString(),
    methodology: {
      assets: ['KOSPI', 'SP500', 'NASDAQ', 'Samsung', 'SKHynix', 'Nvidia'],
      timeframe: '24시간',
      source: '전인구경제연구소 유튜브',
      definition: '전반꿀 지수 = (역방향 적중 수 / 전체 예측 수) × 100%',
    },
    stats: {
      totalPredictions: allPredictions.length,
      honeyCount: totalHoney,
      honeyIndex: overallHoneyIndex,
    },
    assetStats: Object.entries(overallAssetStats).map(([asset, s]) => ({
      asset, ...s
    })),
    periods: [
      { year: 2025, month: 12, predictions: dec2025Data.predictions.length, honeyIndex: dec2025Stats.honeyIndex },
      { year: 2026, month: 1, predictions: jan2026Preds.length, honeyIndex: jan2026Stats.honeyIndex },
    ],
  }
  
  await fs.writeFile('./data/stats/overall.json', JSON.stringify(overall, null, 2))
  console.log(`   ✓ overall.json: 전체 꿀지수 ${overallHoneyIndex}% (${totalHoney}/${allPredictions.length})`)

  // 4. API용 latest.json 생성
  console.log('🌐 api/latest.json 생성...')
  
  await fs.mkdir('./data/api', { recursive: true })
  
  const latest = {
    generatedAt: new Date().toISOString(),
    honeyIndex: overallHoneyIndex,
    totalPredictions: allPredictions.length,
    assetStats: overall.assetStats,
    recentPredictions: allPredictions
      .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10),
  }
  
  await fs.writeFile('./data/api/latest.json', JSON.stringify(latest, null, 2))
  console.log(`   ✓ latest.json 생성`)

  // 5. 기존 파일 정리
  console.log('\n🧹 기존 파일 정리...')
  const oldFiles = [
    './data/videos-2026-raw.json',
    './data/analysis-2026.json', 
    './data/honey-index-final.json',
    './data/honey-index-2025-12-01-to-2025-12-31.json',
    './data/predictions.json',
  ]
  
  for (const file of oldFiles) {
    try {
      await fs.unlink(file)
      console.log(`   ✓ 삭제: ${file}`)
    } catch {
      // ignore
    }
  }

  console.log('\n✅ 완료!')
  console.log('\n📁 새 구조:')
  console.log('data/')
  console.log('├── 2025/')
  console.log('│   └── 12/')
  console.log('│       └── predictions.json')
  console.log('├── 2026/')
  console.log('│   └── 01/')
  console.log('│       ├── videos.json')
  console.log('│       └── predictions.json')
  console.log('├── stats/')
  console.log('│   └── overall.json')
  console.log('└── api/')
  console.log('    └── latest.json')
}

main().catch(console.error)
