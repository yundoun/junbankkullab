"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className 
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showEllipsisStart = currentPage > 3
    const showEllipsisEnd = currentPage < totalPages - 2

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      
      if (showEllipsisStart) {
        pages.push('ellipsis')
      }
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }
      
      if (showEllipsisEnd) {
        pages.push('ellipsis')
      }
      
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm",
          "border border-border bg-background",
          "hover:bg-muted disabled:opacity-50 disabled:pointer-events-none",
          "transition-colors"
        )}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {getPageNumbers().map((page, idx) => (
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium",
              "transition-colors",
              currentPage === page
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted"
            )}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm",
          "border border-border bg-background",
          "hover:bg-muted disabled:opacity-50 disabled:pointer-events-none",
          "transition-colors"
        )}
        aria-label="다음 페이지"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}
