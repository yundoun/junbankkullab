'use client'

interface HoneyIndexProps {
  percentage: number
  totalPredictions: number
}

export function HoneyIndex({ percentage, totalPredictions }: HoneyIndexProps) {
  const getStatusLabel = (pct: number) => {
    if (pct >= 70) return '강한 역상관'
    if (pct >= 55) return '약한 역상관'
    return '상관관계 없음'
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            전체 역상관 지수
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl sm:text-6xl font-bold tabular-nums text-[var(--honey)]">
              {percentage.toFixed(1)}
            </span>
            <span className="text-2xl font-semibold text-[var(--honey)]">%</span>
          </div>
          <div className="mt-3">
            <span className="inline-block px-3 py-1.5 rounded-full text-sm font-medium bg-[var(--honey-bg)] text-[var(--honey)]">
              {getStatusLabel(percentage)}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:items-end gap-1">
          <p className="text-sm text-[var(--text-muted)]">
            분석된 예측 수
          </p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {totalPredictions.toLocaleString()}
            <span className="text-sm font-medium text-[var(--text-secondary)] ml-1">건</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-[var(--honey)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
          <span>0%</span>
          <span>50% (무작위)</span>
          <span>100%</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-[var(--text-muted)] leading-relaxed">
        역상관 지수는 전인구경제연구소의 예측과 반대로 시장이 움직인 비율입니다. 
        50%는 무작위, 50% 이상은 역지표로서의 유효성을 나타냅니다.
      </p>
    </div>
  )
}
