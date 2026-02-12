'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Link2, Check } from "lucide-react"

interface ShareButtonsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 전반꿀 지수 */
  honeyIndex: number
  /** 공유할 URL (기본: 현재 페이지) */
  url?: string
}

export function ShareButtons({
  honeyIndex,
  url,
  className,
  ...props
}: ShareButtonsProps) {
  const [copied, setCopied] = React.useState(false)
  
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://jbklab.vercel.app')
  const shareText = `전인구 소장 예측 적중률 ${honeyIndex.toFixed(1)}% 🍯\n역지표 가설 검증 중!\n#전반꿀 #전인구경제연구소`
  
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
  }
  
  const handleKakaoShare = () => {
    // 카카오 SDK 없으면 링크 복사로 대체
    handleCopyLink()
  }
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = `${shareText}\n${shareUrl}`
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const buttonBase = cn(
    "flex items-center justify-center w-10 h-10 rounded-full",
    "transition-all duration-200",
    "hover:scale-110 active:scale-95",
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
  )

  return (
    <div 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <span className="text-xs text-muted-foreground mr-1">공유</span>
      
      {/* 카카오톡 */}
      <button
        onClick={handleKakaoShare}
        className={cn(
          buttonBase,
          "bg-[#FEE500] hover:bg-[#FDD835] text-[#191919]",
          "focus:ring-[#FEE500]/50"
        )}
        title="카카오톡 공유"
        aria-label="카카오톡으로 공유하기"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.84 1.87 5.33 4.67 6.75-.15.54-.97 3.5-.99 3.73 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.42 4.28-2.83.56.08 1.13.12 1.71.12 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
        </svg>
      </button>
      
      {/* X (Twitter) */}
      <button
        onClick={handleTwitterShare}
        className={cn(
          buttonBase,
          "bg-black hover:bg-neutral-800 text-white",
          "focus:ring-neutral-500/50"
        )}
        title="X에 공유"
        aria-label="X(트위터)에 공유하기"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>
      
      {/* 링크 복사 */}
      <button
        onClick={handleCopyLink}
        className={cn(
          buttonBase,
          copied 
            ? "bg-green-500 text-white" 
            : "bg-muted hover:bg-muted/80 text-muted-foreground",
          "focus:ring-primary/50"
        )}
        title={copied ? "복사됨!" : "링크 복사"}
        aria-label="링크 복사하기"
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
      
      {/* 복사 완료 토스트 */}
      {copied && (
        <span className="text-xs text-green-500 animate-fade-in">
          복사됨!
        </span>
      )}
    </div>
  )
}
