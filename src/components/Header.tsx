'use client'

export function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              전반꿀 연구소
            </h1>
            <span className="hidden sm:inline-block text-xs px-2 py-1 rounded bg-[var(--surface-elevated)] text-[var(--text-muted)]">
              Beta
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] hidden md:block">
            전인구경제연구소 예측 역상관 분석
          </p>
        </div>
      </div>
    </header>
  )
}
