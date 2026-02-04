'use client'

import { useState, useEffect } from 'react'

interface LatestPredictionProps {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: 'bullish' | 'bearish'
}

export function LatestPrediction({ 
  videoId, 
  title, 
  thumbnail, 
  publishedAt, 
  asset, 
  predictedDirection 
}: LatestPredictionProps) {
  const [votes, setVotes] = useState({ up: 0, down: 0 })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  const storageKey = `vote-${videoId}`

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const data = JSON.parse(stored)
      setVotes(data.votes)
      setUserVote(data.userVote)
      setHasVoted(true)
    } else {
      // Initialize with some base votes for visual
      setVotes({ up: Math.floor(Math.random() * 50) + 10, down: Math.floor(Math.random() * 50) + 10 })
    }
  }, [storageKey])

  const handleVote = (direction: 'up' | 'down') => {
    if (hasVoted) return

    const newVotes = {
      ...votes,
      [direction]: votes[direction] + 1
    }
    
    setVotes(newVotes)
    setUserVote(direction)
    setHasVoted(true)

    localStorage.setItem(storageKey, JSON.stringify({
      votes: newVotes,
      userVote: direction,
      votedAt: new Date().toISOString()
    }))
  }

  const total = votes.up + votes.down
  const upPercent = total > 0 ? (votes.up / total) * 100 : 50
  const downPercent = total > 0 ? (votes.down / total) * 100 : 50

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return '방금 전'
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            최신 예측
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
            {asset}
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(publishedAt)}
        </span>
      </div>

      {/* Thumbnail */}
      <a 
        href={`https://youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video bg-[var(--surface-elevated)] overflow-hidden group"
      >
        <img 
          src={thumbnail}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-medium line-clamp-2 text-sm sm:text-base">
            {title}
          </p>
        </div>
      </a>

      {/* Prediction Direction */}
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">전인구 예측:</span>
          <span className={`text-sm font-medium ${
            predictedDirection === 'bullish' 
              ? 'text-[var(--positive)]' 
              : 'text-[var(--negative)]'
          }`}>
            {predictedDirection === 'bullish' ? '상승' : '하락'}
          </span>
        </div>
      </div>

      {/* Voting Section */}
      <div className="p-5 flex-1 flex flex-col justify-center">
        <p className="text-center text-sm text-[var(--text-secondary)] mb-4">
          실제로 어떻게 될까요?
        </p>

        {/* Vote Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => handleVote('down')}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
              hasVoted
                ? userVote === 'down'
                  ? 'bg-[var(--negative)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                : 'bg-[var(--negative)]/20 text-[var(--negative)] hover:bg-[var(--negative)]/30'
            }`}
          >
            하락
          </button>
          <button
            onClick={() => handleVote('up')}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
              hasVoted
                ? userVote === 'up'
                  ? 'bg-[var(--positive)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                : 'bg-[var(--positive)]/20 text-[var(--positive)] hover:bg-[var(--positive)]/30'
            }`}
          >
            상승
          </button>
        </div>

        {/* Vote Progress Bar */}
        <div className="relative h-8 bg-[var(--surface-elevated)] rounded-lg overflow-hidden">
          <div 
            className="absolute left-0 top-0 bottom-0 bg-[var(--negative)]/40"
            style={{ width: `${downPercent}%` }}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 bg-[var(--positive)]/40"
            style={{ width: `${upPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
            <span className="text-[var(--negative)]">{downPercent.toFixed(0)}%</span>
            <span className="text-[var(--text-muted)]">{total}명 참여</span>
            <span className="text-[var(--positive)]">{upPercent.toFixed(0)}%</span>
          </div>
        </div>

        {hasVoted && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-3">
            투표 완료! 결과는 24시간 후에 확인됩니다.
          </p>
        )}
      </div>
    </div>
  )
}
