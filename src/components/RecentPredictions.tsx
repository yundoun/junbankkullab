'use client'

interface Prediction {
  id: string
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
  actualDirection: 'up' | 'down' | 'pending'
  priceChange?: number
  isHoney: boolean | null
}

interface RecentPredictionsProps {
  predictions: Prediction[]
}

export function RecentPredictions({ predictions }: RecentPredictionsProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
        아직 분석된 예측이 없습니다.
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {predictions.map((pred) => (
        <div 
          key={pred.id}
          className="bg-gray-800 rounded-xl p-4 flex gap-4 items-center"
        >
          {/* Thumbnail */}
          <a 
            href={`https://youtube.com/watch?v=${pred.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img 
              src={pred.thumbnail}
              alt={pred.title}
              className="w-32 h-20 object-cover rounded-lg hover:opacity-80 transition-opacity"
            />
          </a>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">{formatDate(pred.publishedAt)}</p>
            <h3 className="font-medium truncate">{pred.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm bg-gray-700 px-2 py-0.5 rounded">
                {pred.asset}
              </span>
              <span className={`text-sm ${
                pred.predictedDirection === 'bullish' ? 'text-bullish' : 'text-bearish'
              }`}>
                예측: {pred.predictedDirection === 'bullish' ? '📈 상승' : '📉 하락'}
              </span>
            </div>
          </div>

          {/* Result */}
          <div className="text-center shrink-0">
            {pred.actualDirection === 'pending' ? (
              <div className="text-gray-400">
                <span className="text-2xl">⏳</span>
                <p className="text-xs mt-1">대기중</p>
              </div>
            ) : (
              <div className={pred.isHoney ? 'text-honey' : 'text-gray-400'}>
                <span className="text-2xl">{pred.isHoney ? '🍯' : '❌'}</span>
                <p className="text-xs mt-1">
                  {pred.priceChange !== undefined && (
                    <span className={pred.actualDirection === 'up' ? 'text-bullish' : 'text-bearish'}>
                      {pred.actualDirection === 'up' ? '+' : ''}{pred.priceChange?.toFixed(1)}%
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
