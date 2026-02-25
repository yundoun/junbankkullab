'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Check, ExternalLink, Play, Sparkles, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { supabase, getSessionId } from "@/lib/supabase"

interface VoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  videoId: string
  title: string
  thumbnail?: string
  publishedAt: string
  asset?: string
  predictedDirection?: "bullish" | "bearish" | "neutral"
  expiresAt?: string
  index?: number // for stagger animation
}

// 시간 포맷 함수
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return "방금 전"
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  return `${diffDays}일 전`
}

export function VoteCard({
  videoId,
  title,
  thumbnail,
  publishedAt,
  asset,
  predictedDirection,
  expiresAt,
  index = 0,
  className,
  ...props
}: VoteCardProps) {
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [upVotes, setUpVotes] = useState(0)
  const [downVotes, setDownVotes] = useState(0)
  const [loading, setLoading] = useState(true)

  // Supabase에서 데이터 로드
  useEffect(() => {
    loadData()
  }, [videoId])

  async function loadData() {
    setLoading(true)
    
    // 1. prediction 조회 또는 생성
    let { data: prediction } = await supabase
      .from('predictions')
      .select('id')
      .eq('video_id', videoId)
      .single()
    
    // prediction이 없으면 생성
    if (!prediction) {
      const { data: newPrediction } = await supabase
        .from('predictions')
        .insert({
          video_id: videoId,
          title: title,
          published_at: publishedAt,
          predicted_tone: predictedDirection === 'bullish' ? 'positive' : 'negative',
          status: 'pending',
        })
        .select('id')
        .single()
      
      prediction = newPrediction
    }
    
    if (prediction) {
      setPredictionId(prediction.id)
      
      // 2. 투표 통계 조회
      const { data: votes } = await supabase
        .from('votes')
        .select('vote')
        .eq('prediction_id', prediction.id)
      
      if (votes) {
        const up = votes.filter(v => v.vote === 'bullish').length
        const down = votes.filter(v => v.vote === 'bearish').length
        setUpVotes(up)
        setDownVotes(down)
      }
      
      // 3. 내 투표 확인
      const sessionId = getSessionId()
      const { data: myVote } = await supabase
        .from('votes')
        .select('vote')
        .eq('prediction_id', prediction.id)
        .eq('session_id', sessionId)
        .single()
      
      if (myVote) {
        setUserVote(myVote.vote === 'bullish' ? 'up' : 'down')
        setHasVoted(true)
      }
    }
    
    setLoading(false)
  }

  const handleVote = async (direction: "up" | "down") => {
    if (hasVoted || !predictionId) return

    setIsAnimating(true)
    setShowConfetti(true)
    setUserVote(direction)
    setHasVoted(true)

    // Supabase에 투표 저장
    const sessionId = getSessionId()
    const voteValue = direction === 'up' ? 'bullish' : 'bearish'
    
    await supabase
      .from('votes')
      .upsert({
        prediction_id: predictionId,
        session_id: sessionId,
        vote: voteValue,
      }, {
        onConflict: 'prediction_id,session_id'
      })

    // 투표 수 업데이트
    if (direction === "up") {
      setUpVotes(prev => prev + 1)
    } else {
      setDownVotes(prev => prev + 1)
    }

    // 애니메이션 종료
    setTimeout(() => {
      setIsAnimating(false)
      setShowConfetti(false)
    }, 1000)
  }

  const totalVotes = upVotes + downVotes
  const upPercent = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 50
  const downPercent = 100 - upPercent

  // 시간 계산
  const publishedDate = new Date(publishedAt)
  const timeLabel = formatTimeAgo(publishedDate)

  // 남은 시간 계산
  const now = new Date()
  const expiresDate = expiresAt ? new Date(expiresAt) : new Date(publishedDate.getTime() + 24 * 60 * 60 * 1000)
  const remainingMs = Math.max(0, expiresDate.getTime() - now.getTime())
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  const thumbnailUrl = thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  
  // Stagger delay
  const staggerDelay = Math.min(index * 100, 500)

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-card/80",
        "transition-all duration-500 ease-out",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
        "animate-scale-in fill-backwards",
        isAnimating && "scale-[1.02]",
        className
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
      {...props}
    >
      {/* 배경 썸네일 (흐리게) */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover opacity-10 blur-2xl scale-125 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/80" />
      </div>

      {/* Confetti effect on vote */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute w-4 h-4 animate-ping",
                userVote === "up" ? "text-bullish" : "text-bearish"
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 500}ms`,
                animationDuration: `${500 + Math.random() * 500}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col p-4 sm:p-5">
        {/* 썸네일 */}
        <a
          href={`https://youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="thumbnail-container relative w-full aspect-[2/1] rounded-lg overflow-hidden mb-3 group/thumb"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center transform scale-75 group-hover/thumb:scale-100 transition-transform duration-300 shadow-xl">
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        </a>

        {/* 종목 + 예측 방향 뱃지 (눈에 띄게!) */}
        {asset && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-sm font-bold text-primary">
              📊 {asset}
            </span>
            {predictedDirection && predictedDirection !== 'neutral' && (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-semibold",
                predictedDirection === 'bullish' 
                  ? "bg-bullish/10 text-bullish border border-bullish/30" 
                  : "bg-red-500/10 text-red-500 border border-red-500/30"
              )}>
                {predictedDirection === 'bullish' ? '📈 상승' : '📉 하락'} 예측
              </span>
            )}
          </div>
        )}

        {/* 영상 제목 + 업로드 시간 */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{timeLabel}</p>
        </div>

        {/* 투표 버튼 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted || loading || !predictionId}
            onClick={() => handleVote("up")}
            className={cn(
              "relative h-14 flex-col gap-1 border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasVoted && userVote === "up" && "border-bullish bg-bullish/15 shadow-lg shadow-bullish/20",
              !hasVoted && "hover:border-bullish hover:bg-bullish/10 hover:shadow-md hover:shadow-bullish/10"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className={cn(
                "w-5 h-5 transition-all duration-300",
                hasVoted && userVote === "up" ? "text-bullish scale-110" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold text-base transition-colors duration-300",
                hasVoted && userVote === "up" && "text-bullish"
              )}>
                상승
              </span>
              {hasVoted && userVote === "up" && (
                <Check className="w-4 h-4 text-bullish animate-scale-in" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs font-medium text-muted-foreground animate-fade-in">
                {upPercent}% ({upVotes}명)
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted || loading || !predictionId}
            onClick={() => handleVote("down")}
            className={cn(
              "relative h-14 flex-col gap-1 border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasVoted && userVote === "down" && "border-bearish bg-bearish/15 shadow-lg shadow-bearish/20",
              !hasVoted && "hover:border-bearish hover:bg-bearish/10 hover:shadow-md hover:shadow-bearish/10"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className={cn(
                "w-5 h-5 transition-all duration-300",
                hasVoted && userVote === "down" ? "text-bearish scale-110" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold text-base transition-colors duration-300",
                hasVoted && userVote === "down" && "text-bearish"
              )}>
                하락
              </span>
              {hasVoted && userVote === "down" && (
                <Check className="w-4 h-4 text-bearish animate-scale-in" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs font-medium text-muted-foreground animate-fade-in">
                {downPercent}% ({downVotes}명)
              </span>
            )}
          </Button>
        </div>

        {/* 투표 결과 바 - 내 선택 색상 강조 */}
        {hasVoted && (
          <div className="space-y-2 animate-fade-up">
            <div className="relative flex h-5 rounded-full overflow-hidden bg-muted/20">
              {/* 상승 바 */}
              <div
                className={cn(
                  "transition-all duration-1000 ease-out rounded-l-full",
                  userVote === "up" 
                    ? "bg-bullish" 
                    : "bg-bullish/30"
                )}
                style={{ width: `${upPercent}%` }}
              />
              {/* 하락 바 */}
              <div
                className={cn(
                  "transition-all duration-1000 ease-out rounded-r-full",
                  userVote === "down" 
                    ? "bg-bearish" 
                    : "bg-bearish/30"
                )}
                style={{ width: `${downPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className={cn(
                userVote === "up" ? "text-bullish font-bold" : "text-muted-foreground"
              )}>
                상승 {upPercent}%
              </span>
              <span className={cn(
                userVote === "down" ? "text-bearish font-bold" : "text-muted-foreground"
              )}>
                하락 {downPercent}%
              </span>
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-medium">
            <Users className="w-3 h-3" />
            {totalVotes}명 참여
          </span>
          {remainingMs > 0 ? (
            <span className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              {remainingHours}시간 {remainingMins}분 남음
            </span>
          ) : (
            <span className="text-primary font-bold animate-pulse">결과 확정</span>
          )}
        </div>
      </div>
    </div>
  )
}
