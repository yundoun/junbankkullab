const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_ID = 'UCznImSIaxZR7fdLCICLdgaQ' // 전인구경제연구소

interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string }
    snippet: {
      title: string
      description: string
      thumbnails: {
        medium: { url: string }
        high: { url: string }
      }
      publishedAt: string
    }
  }>
  nextPageToken?: string
}

export async function fetchChannelVideos(
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not set')
  }

  const params = new URLSearchParams({
    part: 'snippet',
    channelId: CHANNEL_ID,
    type: 'video',
    order: 'date',
    maxResults: String(Math.min(maxResults, 50)),
    key: YOUTUBE_API_KEY,
  })

  if (pageToken) {
    params.set('pageToken', pageToken)
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`YouTube API error: ${error}`)
  }

  const data: YouTubeSearchResponse = await response.json()

  const videos: YouTubeVideo[] = data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
  }))

  return {
    videos,
    nextPageToken: data.nextPageToken,
  }
}

export async function fetchAllVideos(limit: number = 100): Promise<YouTubeVideo[]> {
  const allVideos: YouTubeVideo[] = []
  let pageToken: string | undefined

  while (allVideos.length < limit) {
    const { videos, nextPageToken } = await fetchChannelVideos(50, pageToken)
    allVideos.push(...videos)
    
    if (!nextPageToken) break
    pageToken = nextPageToken
  }

  return allVideos.slice(0, limit)
}
