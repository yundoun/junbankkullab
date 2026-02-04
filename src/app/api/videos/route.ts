import { NextResponse } from 'next/server'
import { fetchAllVideos } from '@/lib/youtube'
import { analyzeTitle } from '@/lib/analyzer'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    const videos = await fetchAllVideos(limit)

    const analyzedVideos = videos.map((video) => {
      const analysis = analyzeTitle(video.title)
      return {
        ...video,
        analysis,
      }
    })

    return NextResponse.json({
      success: true,
      count: analyzedVideos.length,
      videos: analyzedVideos,
    })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
