'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'

interface DataPoint {
  date: string
  value: number
}

interface HoneyIndexChartProps {
  currentValue: number
  data?: DataPoint[]
  totalPredictions: number
}

// Generate mock historical data for now
// TODO: Replace with real time series data
function generateMockData(currentValue: number): DataPoint[] {
  const data: DataPoint[] = []
  const now = new Date()
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Generate value with some variance around the current value
    const variance = (Math.random() - 0.5) * 20
    const value = Math.max(0, Math.min(100, currentValue + variance - (i * 0.3)))
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 10) / 10
    })
  }
  
  // Ensure last point is the current value
  data[data.length - 1].value = currentValue
  
  return data
}

export function HoneyIndexChart({ currentValue, data, totalPredictions }: HoneyIndexChartProps) {
  const chartData = data || generateMockData(currentValue)
  
  // Calculate change
  const firstValue = chartData[0]?.value || currentValue
  const change = currentValue - firstValue
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0

  // Recharts doesn't support CSS variables in SVG - use hex values directly
  const COLORS = {
    honey: '#fcd535',
    positive: '#0ecb81',
    negative: '#f6465d',
    border: '#2b3139',
    textMuted: '#5e6673',
    surfaceElevated: '#1a1f26',
    textSecondary: '#848e9c',
  }

  // Always use honey color for the main chart
  const chartColor = COLORS.honey

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          전반꿀 지수
        </span>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span 
                className="text-4xl font-bold tabular-nums"
                style={{ color: chartColor }}
              >
                {currentValue.toFixed(1)}
              </span>
              <span className="text-lg" style={{ color: chartColor }}>%</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {totalPredictions}개 예측 기준
            </p>
          </div>
          
          <div className="text-right">
            <span className={`inline-block text-sm font-bold px-2.5 py-1 rounded-full ${
              change >= 0 
                ? 'bg-[var(--positive-bg)] text-[var(--positive)]' 
                : 'bg-[var(--negative-bg)] text-[var(--negative)]'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%p
            </span>
            <p className="text-xs text-[var(--text-muted)] mt-1">30일 변화</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="honeyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: COLORS.textMuted }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: COLORS.textMuted }}
              tickFormatter={(value) => `${value}%`}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1f26',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#848e9c' }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, '전반꿀 지수']}
              labelFormatter={(label) => {
                const date = new Date(label)
                return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
              }}
            />
            <ReferenceLine 
              y={50} 
              stroke={COLORS.border}
              strokeDasharray="3 3" 
              label={{ 
                value: '무작위', 
                position: 'right',
                fill: COLORS.textMuted,
                fontSize: 10
              }} 
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2.5}
              fill="url(#honeyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        <div className="flex justify-between">
          <span>50% = 무작위</span>
          <span>높을수록 역지표 정확도 ↑</span>
        </div>
      </div>
    </div>
  )
}
