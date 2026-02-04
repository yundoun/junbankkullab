import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'predictions.json')
    const data = await fs.readFile(dataPath, 'utf-8')
    const parsed = JSON.parse(data)

    // Get recent predictions (completed ones for display)
    const completePredictions = parsed.predictions
      .filter((p: any) => p.isHoney !== undefined)
      .slice(0, 20)
      .map((p: any) => ({
        id: p.id,
        videoId: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        publishedAt: p.publishedAt,
        asset: p.asset,
        predictedDirection: p.sentiment,
        actualDirection: p.actualDirection,
        priceChange: p.priceChange,
        isHoney: p.isHoney,
      }))

    // Get pending predictions (no market data yet)
    const pendingPredictions = parsed.predictions
      .filter((p: any) => p.isHoney === undefined)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id + '-pending',
        videoId: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        publishedAt: p.publishedAt,
        asset: p.asset,
        predictedDirection: p.sentiment,
        actualDirection: 'pending' as const,
        priceChange: undefined,
        isHoney: null,
      }))

    return NextResponse.json({
      overallHoneyIndex: parsed.stats.honeyIndex,
      totalPredictions: parsed.stats.completePredictions,
      assetStats: parsed.stats.assetStats || [],
      recentPredictions: [...completePredictions, ...pendingPredictions],
      collectedAt: parsed.collectedAt,
    })
  } catch (error) {
    // Fallback to mock data if file doesn't exist
    console.error('Error reading predictions:', error)
    
    return NextResponse.json({
      overallHoneyIndex: 0,
      totalPredictions: 0,
      assetStats: [],
      recentPredictions: [],
      collectedAt: null,
    })
  }
}
