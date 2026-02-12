import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: '전반꿀 연구소',
  description: '전인구경제연구소 예측 vs 실제 시장 데이터 역상관관계 분석',
  openGraph: {
    title: '전반꿀 연구소',
    description: '전인구 반대로 하면 꿀? 데이터로 검증합니다.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
