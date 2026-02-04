'use client'

interface AssetStat {
  asset: string
  honeyIndex: number
  predictions: number
}

interface AssetStatsProps {
  assets: AssetStat[]
}

export function AssetStats({ assets }: AssetStatsProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center">
        <p className="text-[var(--text-muted)] text-sm">분석된 종목이 없습니다</p>
      </div>
    )
  }

  const getColor = (pct: number) => {
    if (pct >= 70) return 'var(--honey)'
    if (pct >= 55) return 'var(--text-secondary)'
    return 'var(--text-muted)'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((stat) => (
        <div 
          key={stat.asset}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--text-muted)] transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[var(--text-primary)]">
              {stat.asset}
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              {stat.predictions}건
            </span>
          </div>
          
          <p 
            className="text-3xl font-bold tabular-nums"
            style={{ color: getColor(stat.honeyIndex) }}
          >
            {stat.honeyIndex.toFixed(1)}%
          </p>
          
          {/* Mini progress bar */}
          <div className="mt-3 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${stat.honeyIndex}%`,
                backgroundColor: getColor(stat.honeyIndex)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
