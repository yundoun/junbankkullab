'use client'

import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface VoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  videoId: string
  title: string
  thumbnail?: string
  publishedAt: string
  asset?: string
  predictedDirection?: "bullish" | "bearish" | "neutral"
  // Vote state
  userVote?: "up" | "down" | null
  upVotes?: number
  downVotes?: number
  onVote?: (direction: "up" | "down") => void
}

export function VoteCard({
  videoId,
  title,
  thumbnail,
  publishedAt,
  asset,
  predictedDirection,
  userVote = null,
  upVotes = 0,
  downVotes = 0,
  onVote,
  className,
  ...props
}: VoteCardProps) {
  const totalVotes = upVotes + downVotes
  const upPercent = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 50
  const downPercent = 100 - upPercent
  
  const directionLabel = {
    bullish: "상승",
    bearish: "하락",
    neutral: "중립",
  }
  
  const directionBadgeVariant = {
    bullish: "bullish" as const,
    bearish: "bearish" as const,
    neutral: "secondary" as const,
  }
  
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card overflow-hidden",
        "transition-all duration-200",
        className
      )}
      {...props}
    >
      {/* Thumbnail */}
      {thumbnail && (
        <div className="relative aspect-video bg-muted">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* Live badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="honey" className="gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              투표중
            </Badge>
          </div>
          {/* Prediction badge */}
          {predictedDirection && predictedDirection !== "neutral" && (
            <div className="absolute top-3 right-3">
              <Badge variant={directionBadgeVariant[predictedDirection]}>
                전인구 예측: {directionLabel[predictedDirection]}
              </Badge>
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="flex flex-col gap-4 p-5">
        {/* Title & meta */}
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {asset && (
              <>
                <span className="font-medium text-foreground">{asset}</span>
                <span>•</span>
              </>
            )}
            <span>{new Date(publishedAt).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
        
        {/* Vote buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="vote-up"
            size="lg"
            data-selected={userVote === "up"}
            onClick={() => onVote?.("up")}
            className="flex-col h-auto py-3"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">상승</span>
          </Button>
          <Button
            variant="vote-down"
            size="lg"
            data-selected={userVote === "down"}
            onClick={() => onVote?.("down")}
            className="flex-col h-auto py-3"
          >
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm">하락</span>
          </Button>
        </div>
        
        {/* Vote stats */}
        {totalVotes > 0 && (
          <div className="space-y-2">
            {/* Bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-bullish transition-all duration-300"
                style={{ width: `${upPercent}%` }}
              />
              <div
                className="bg-bearish transition-all duration-300"
                style={{ width: `${downPercent}%` }}
              />
            </div>
            {/* Labels */}
            <div className="flex justify-between text-xs">
              <span className="text-bullish font-medium">{upPercent}% 상승</span>
              <span className="text-muted-foreground">{totalVotes}명 참여</span>
              <span className="text-bearish font-medium">{downPercent}% 하락</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
