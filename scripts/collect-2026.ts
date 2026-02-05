/**
 * 2026년 영상만 수집 - 데이터 검토용
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_ID = 'UCznImSIaxZR7fdLCICLdgaQ' // 전인구경제연구소

interface Video {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
}

// Get channel's uploads playlist ID
async function getUploadsPlaylistId(): Promise<string> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const params = new URLSearchParams({
    part: 'contentDetails',
    id: CHANNEL_ID,
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`)
  if (!response.ok) throw new Error(`YouTube API error: ${await response.text()}`)

  const data = await response.json()
  return data.items[0].contentDetails.relatedPlaylists.uploads
}

// Fetch all 2026 videos
async function fetch2026Videos(): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const playlistId = await getUploadsPlaylistId()
  console.log(`Uploads playlist: ${playlistId}\n`)

  const cutoffDate = new Date('2026-01-01T00:00:00Z')
  const videos: Video[] = []
  let pageToken = ''

  while (true) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: YOUTUBE_API_KEY,
    })
    
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    if (!response.ok) throw new Error(`YouTube API error: ${await response.text()}`)

    const data = await response.json()
    
    let foundOlderVideo = false
    
    for (const item of data.items) {
      if (item.snippet.resourceId.kind !== 'youtube#video') continue
      
      const publishedAt = new Date(item.snippet.publishedAt)
      
      if (publishedAt < cutoffDate) {
        foundOlderVideo = true
        break
      }
      
      videos.push({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        publishedAt: item.snippet.publishedAt,
      })
    }

    if (foundOlderVideo || !data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return videos
}

async function main() {
  console.log('=== 2026년 전인구경제연구소 영상 수집 ===\n')
  
  const videos = await fetch2026Videos()
  
  console.log(`총 ${videos.length}개 영상\n`)
  console.log('--- 전체 목록 ---\n')
  
  for (const video of videos) {
    const date = new Date(video.publishedAt).toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    console.log(`[${date}] ${video.title}`)
    console.log(`  ID: ${video.id}`)
    console.log(`  URL: https://youtube.com/watch?v=${video.id}`)
    console.log('')
  }

  // Save raw data
  const fs = await import('fs/promises')
  await fs.mkdir('./data', { recursive: true })
  await fs.writeFile('./data/videos-2026-raw.json', JSON.stringify(videos, null, 2))
  console.log(`\n저장됨: ./data/videos-2026-raw.json`)
}

main().catch(console.error)
