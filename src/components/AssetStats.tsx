'use client'

interface AssetStat {
  asset: string
  honeyIndex: number
  predictions: number
  emoji: string
}

interface AssetStatsProps {
  assets: AssetStat[]
}

const assetEmojis: Record<string, string> = {
  bitcoin: '₿',
  ethereum: 'Ξ',
  kospi: '🇰🇷',
  nasdaq: '🇺🇸',
  sp500: '📈',
  tesla: '🚗',
  samsung: '📱',
  nvidia: '🎮',
  default: '📊',
}

export function AssetStats({ assets }: AssetStatsProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
        아직 분석된 종목이 없습니다.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((stat) => (
        <div 
          key={stat.asset}
          className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">
              {assetEmojis[stat.asset.toLowerCase()] || assetEmojis.default}
            </span>
            <span className="text-gray-400 text-sm">
              {stat.predictions}건
            </span>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">{stat.asset}</h3>
          
          <div className={`text-3xl font-bold ${
            stat.honeyIndex >= 70 ? 'text-honey' :
            stat.honeyIndex >= 50 ? 'text-yellow-500' :
            'text-gray-400'
          }`}>
            {stat.honeyIndex.toFixed(1)}%
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                stat.honeyIndex >= 70 ? 'bg-honey' :
                stat.honeyIndex >= 50 ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}
              style={{ width: `${stat.honeyIndex}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
