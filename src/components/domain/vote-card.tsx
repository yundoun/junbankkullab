'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface VoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  videoId: string
  title: string
  thumbnail?: string
  publishedAt: string
  asset?: string
  predictedDirection?: "bullish" | "bearish" | "neutral"
  expiresAt?: string
}

// 로컬스토리지 키
const STORAGE_KEY = "jbk_votes"

interface StoredVote {
  vote: "up" | "down"
  timestamp: number
}

function getStoredVotes(): Record<string, StoredVote> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setStoredVote(key: string, vote: "up" | "down") {
  if (typeof window === "undefined") return
  try {
    const votes = getStoredVotes()
    votes[key] = { vote, timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes))
  } catch {
    // ignore
  }
}

export function VoteCard({
  videoId,
  title,
  thumbnail,
  publishedAt,
  asset,
  predictedDirection,
  expiresAt,
  className,
  ...props
}: VoteCardProps) {
  const voteKey = `${videoId}_${asset}`
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [upVotes, setUpVotes] = useState(Math.floor(Math.random() * 30) + 20)
  const [downVotes, setDownVotes] = useState(Math.floor(Math.random() * 30) + 20)

  // 로컬스토리지에서 기존 투표 확인
  useEffect(() => {
    const stored = getStoredVotes()
    if (stored[voteKey]) {
      setUserVote(stored[voteKey].vote)
      setHasVoted(true)
    }
  }, [voteKey])

  const handleVote = (direction: "up" | "down") => {
    if (hasVoted) return

    setIsAnimating(true)
    setUserVote(direction)
    setHasVoted(true)
    setStoredVote(voteKey, direction)

    // 투표 수 업데이트 (fake)
    if (direction === "up") {
      setUpVotes(prev => prev + 1)
    } else {
      setDownVotes(prev => prev + 1)
    }

    // 애니메이션 종료
    setTimeout(() => setIsAnimating(false), 600)
  }

  const totalVotes = upVotes + downVotes
  const upPercent = Math.round((upVotes / totalVotes) * 100)
  const downPercent = 100 - upPercent

  // 시간 계산
  const publishedDate = new Date(publishedAt)
  const now = new Date()
  const hoursAgo = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60))
  const timeLabel = hoursAgo < 1 ? "방금 전" : `${hoursAgo}시간 전`

  // 남은 시간 계산
  const expiresDate = expiresAt ? new Date(expiresAt) : new Date(publishedDate.getTime() + 24 * 60 * 60 * 1000)
  const remainingMs = Math.max(0, expiresDate.getTime() - now.getTime())
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  const isBullish = predictedDirection === "bullish"

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-card/90",
        "transition-all duration-300",
        isAnimating && "scale-[1.02]",
        className
      )}
      {...props}
    >
      {/* 배경 썸네일 (흐리게) */}
      {thumbnail && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-10 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/80" />
        </div>
      )}

      <div className="relative z-10 flex flex-col p-5 sm:p-6">
        {/* 상단: 메타 정보 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-primary">LIVE</span>
            {asset && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-semibold text-foreground">{asset}</span>
              </>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeLabel}</span>
          </div>
          
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* 핵심: 전인구 예측 */}
        <div className="text-center py-6 sm:py-8">
          <p className="text-sm text-muted-foreground mb-2">전인구 예측</p>
          <div 
            className={cn(
              "inline-flex items-center gap-3 px-6 py-3 rounded-xl",
              "transition-all duration-300",
              isBullish 
                ? "bg-bullish/10 border border-bullish/30" 
                : "bg-bearish/10 border border-bearish/30"
            )}
          >
            {isBullish ? (
              <TrendingUp className="w-8 h-8 text-bullish" />
            ) : (
              <TrendingDown className="w-8 h-8 text-bearish" />
            )}
            <span 
              className={cn(
                "text-3xl sm:text-4xl font-bold tracking-tight",
                isBullish ? "text-bullish" : "text-bearish"
              )}
            >
              {isBullish ? "상승" : "하락"}
            </span>
          </div>
        </div>

        {/* 제목 (작게) */}
        <p className="text-sm text-muted-foreground text-center mb-6 line-clamp-2 px-4">
          {title}
        </p>

        {/* 투표 버튼 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted}
            onClick={() => handleVote("up")}
            className={cn(
              "relative h-14 flex-col gap-1 border-2 transition-all duration-300",
              hasVoted && userVote === "up" && "border-bullish bg-bullish/10",
              !hasVoted && "hover:border-bullish hover:bg-bullish/5"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className={cn(
                "w-5 h-5",
                hasVoted && userVote === "up" ? "text-bullish" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-semibold",
                hasVoted && userVote === "up" && "text-bullish"
              )}>
                상승
              </span>
              {hasVoted && userVote === "up" && (
                <Check className="w-4 h-4 text-bullish animate-in zoom-in duration-300" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs text-muted-foreground">{upPercent}%</span>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted}
            onClick={() => handleVote("down")}
            className={cn(
              "relative h-14 flex-col gap-1 border-2 transition-all duration-300",
              hasVoted && userVote === "down" && "border-bearish bg-bearish/10",
              !hasVoted && "hover:border-bearish hover:bg-bearish/5"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className={cn(
                "w-5 h-5",
                hasVoted && userVote === "down" ? "text-bearish" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-semibold",
                hasVoted && userVote === "down" && "text-bearish"
              )}>
                하락
              </span>
              {hasVoted && userVote === "down" && (
                <Check className="w-4 h-4 text-bearish animate-in zoom-in duration-300" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs text-muted-foreground">{downPercent}%</span>
            )}
          </Button>
        </div>

        {/* 투표 결과 바 */}
        {hasVoted && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-bullish transition-all duration-700 ease-out"
                style={{ width: `${upPercent}%` }}
              />
              <div
                className="bg-bearish transition-all duration-700 ease-out"
                style={{ width: `${downPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>상승 {upPercent}%</span>
              <span>하락 {downPercent}%</span>
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          <span>{totalVotes}명 참여</span>
          {remainingMs > 0 ? (
            <span>{remainingHours}시간 {remainingMins}분 남음</span>
          ) : (
            <span className="text-primary font-medium">결과 확정</span>
          )}
        </div>
      </div>
    </div>
  )
}
