import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '전반꿀 연구소 | JunBanKkul Lab',
  description: '전인구 반대로 하면 꿀? 데이터로 검증합니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
