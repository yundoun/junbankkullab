'use client'

interface HoneyIndexProps {
  percentage: number
  totalPredictions: number
}

export function HoneyIndex({ percentage, totalPredictions }: HoneyIndexProps) {
  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 70) return 'text-honey'
    if (pct >= 50) return 'text-yellow-500'
    return 'text-gray-400'
  }

  const getMessage = (pct: number) => {
    if (pct >= 80) return '🍯🍯🍯 전설의 역지표'
    if (pct >= 70) return '🍯🍯 전반꿀 확정'
    if (pct >= 60) return '🍯 어느정도 꿀'
    if (pct >= 50) return '🤔 반반'
    return '❌ 전반꿀 아님'
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-8 text-center">
      <h2 className="text-xl text-gray-400 mb-4">전체 전반꿀 지수</h2>
      
      <div className={`text-7xl md:text-9xl font-bold ${getColor(percentage)}`}>
        {percentage.toFixed(1)}%
      </div>
      
      <p className="text-2xl mt-4">{getMessage(percentage)}</p>
      
      <p className="text-gray-500 mt-4">
        총 {totalPredictions}개 예측 분석
      </p>

      <div className="mt-6 text-sm text-gray-400">
        <p>= 전인구가 상승 예측 → 실제 하락 확률</p>
        <p>+ 전인구가 하락 예측 → 실제 상승 확률</p>
      </div>
    </div>
  )
}
