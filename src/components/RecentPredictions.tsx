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
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center">
        <p className="text-[var(--text-muted)] text-sm">분석된 예측이 없습니다</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--text-muted)] font-medium">
        <div className="col-span-1">날짜</div>
        <div className="col-span-5">영상</div>
        <div className="col-span-2">종목</div>
        <div className="col-span-2">예측</div>
        <div className="col-span-2 text-right">결과</div>
      </div>

      {/* Predictions List */}
      <div className="divide-y divide-[var(--border)]">
        {predictions.map((pred) => (
          <div 
            key={pred.id}
            className="px-5 py-4 hover:bg-[var(--surface-elevated)] transition-colors"
          >
            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1 text-xs text-[var(--text-muted)]">
                {formatDate(pred.publishedAt)}
              </div>
              
              <div className="col-span-5 flex items-center gap-3">
                <a 
                  href={`https://youtube.com/watch?v=${pred.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img 
                    src={pred.thumbnail}
                    alt=""
                    className="w-24 h-14 object-cover rounded bg-[var(--surface-elevated)]"
                    loading="lazy"
                  />
                </a>
                <a 
                  href={`https://youtube.com/watch?v=${pred.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] line-clamp-2 transition-colors"
                >
                  {pred.title}
                </a>
              </div>
              
              <div className="col-span-2">
                <span className="text-sm px-2 py-1 rounded bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                  {pred.asset}
                </span>
              </div>
              
              <div className="col-span-2">
                <span className={`text-sm ${
                  pred.predictedDirection === 'bullish' 
                    ? 'text-[var(--positive)]' 
                    : 'text-[var(--negative)]'
                }`}>
                  {pred.predictedDirection === 'bullish' ? '상승' : '하락'}
                </span>
              </div>
              
              <div className="col-span-2 text-right">
                {pred.actualDirection === 'pending' ? (
                  <span className="text-xs text-[var(--text-muted)]">대기중</span>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-sm font-medium tabular-nums ${
                      pred.actualDirection === 'up' 
                        ? 'text-[var(--positive)]' 
                        : 'text-[var(--negative)]'
                    }`}>
                      {pred.priceChange !== undefined && (
                        <>
                          {pred.priceChange >= 0 ? '+' : ''}
                          {pred.priceChange.toFixed(1)}%
                        </>
                      )}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      pred.isHoney 
                        ? 'bg-[var(--honey)]/20 text-[var(--honey)]' 
                        : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {pred.isHoney ? '역상관' : '정상관'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              <div className="flex gap-3">
                <a 
                  href={`https://youtube.com/watch?v=${pred.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img 
                    src={pred.thumbnail}
                    alt=""
                    className="w-28 h-16 object-cover rounded bg-[var(--surface-elevated)]"
                    loading="lazy"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    {formatDate(pred.publishedAt)}
                  </p>
                  <a 
                    href={`https://youtube.com/watch?v=${pred.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--text-primary)] line-clamp-2"
                  >
                    {pred.title}
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                    {pred.asset}
                  </span>
                  <span className={`text-xs ${
                    pred.predictedDirection === 'bullish' 
                      ? 'text-[var(--positive)]' 
                      : 'text-[var(--negative)]'
                  }`}>
                    {pred.predictedDirection === 'bullish' ? '상승 예측' : '하락 예측'}
                  </span>
                </div>
                
                {pred.actualDirection !== 'pending' && (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium tabular-nums ${
                      pred.actualDirection === 'up' 
                        ? 'text-[var(--positive)]' 
                        : 'text-[var(--negative)]'
                    }`}>
                      {pred.priceChange !== undefined && (
                        <>
                          {pred.priceChange >= 0 ? '+' : ''}
                          {pred.priceChange.toFixed(1)}%
                        </>
                      )}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      pred.isHoney 
                        ? 'bg-[var(--honey)]/20 text-[var(--honey)]' 
                        : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {pred.isHoney ? '역상관' : '정상관'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
