import { NextResponse } from 'next/server'

// Mock data for initial development
// Will be replaced with real database queries

export async function GET() {
  // TODO: Replace with real database queries
  const mockStats = {
    overallHoneyIndex: 73.5,
    totalPredictions: 87,
    assetStats: [
      { asset: 'Bitcoin', honeyIndex: 78.2, predictions: 32, emoji: '₿' },
      { asset: 'KOSPI', honeyIndex: 71.4, predictions: 21, emoji: '🇰🇷' },
      { asset: 'NASDAQ', honeyIndex: 68.9, predictions: 18, emoji: '🇺🇸' },
      { asset: 'Tesla', honeyIndex: 82.1, predictions: 11, emoji: '🚗' },
      { asset: 'Samsung', honeyIndex: 65.0, predictions: 8, emoji: '📱' },
    ],
    recentPredictions: [
      {
        id: '1',
        videoId: 'example1',
        title: '비트코인 대폭락 온다! 지금 당장 팔아라',
        thumbnail: 'https://i.ytimg.com/vi/example1/hqdefault.jpg',
        publishedAt: '2026-02-01T10:00:00Z',
        asset: 'Bitcoin',
        predictedDirection: 'bearish' as const,
        actualDirection: 'up' as const,
        priceChange: 8.5,
        isHoney: true,
      },
      {
        id: '2',
        videoId: 'example2',
        title: '코스피 반등 신호! 지금이 매수 기회',
        thumbnail: 'https://i.ytimg.com/vi/example2/hqdefault.jpg',
        publishedAt: '2026-01-28T09:00:00Z',
        asset: 'KOSPI',
        predictedDirection: 'bullish' as const,
        actualDirection: 'down' as const,
        priceChange: -2.3,
        isHoney: true,
      },
      {
        id: '3',
        videoId: 'example3',
        title: '테슬라 끝났다, 더 이상 희망 없다',
        thumbnail: 'https://i.ytimg.com/vi/example3/hqdefault.jpg',
        publishedAt: '2026-01-25T11:00:00Z',
        asset: 'Tesla',
        predictedDirection: 'bearish' as const,
        actualDirection: 'up' as const,
        priceChange: 12.7,
        isHoney: true,
      },
    ],
  }

  return NextResponse.json(mockStats)
}
