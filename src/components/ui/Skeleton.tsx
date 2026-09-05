"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  animation?: "pulse" | "wave" | "none"
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "pulse",
  ...props
}: SkeletonProps) {
  const baseStyles = "bg-border relative overflow-hidden"
  
  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  }

  const animationStyles = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    none: "",
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width,
        height: variant === "text" ? undefined : height,
      }}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className, ...props }: { lines?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-4 rounded-xl border bg-card shadow-sm", className)} {...props}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={120} />
      <div className="flex items-center gap-2">
        <Skeleton variant="text" width="80px" />
        <Skeleton variant="text" width="60px" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-x-auto", className)} {...props}>
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-border bg-bg/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton variant="text" width="100%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-bg/50 transition-colors">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-4">
                  <Skeleton variant="text" width="80%" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonList({ items = 5, className, ...props }: { items?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="text" width="80px" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton variant="circular" width={40} height={40} className={className} {...props} />
  )
}

export function SkeletonButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton variant="rectangular" width={120} height={40} className={cn("rounded-lg", className)} {...props} />
  )
}

export function SkeletonInput({ className, ...props }: React.HTMLAttributes<HTMLInputElement>) {
  return (
    <Skeleton variant="rectangular" width="100%" height={40} className={cn("rounded-lg", className)} {...props} />
  )
}

export function SkeletonSelect({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton variant="rectangular" width="100%" height={40} className={cn("rounded-lg", className)} {...props} />
  )
}

export function SkeletonBadge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Skeleton variant="rectangular" width={80} height={24} className={cn("rounded-full", className)} {...props} />
  )
}

export function SkeletonAvatarGroup({ count = 3, className, ...props }: { count?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex -space-x-2", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAvatar key={i} className="ring-2 ring-surface" />
      ))}
    </div>
  )
}

export function LoadingSpinner({ size = "md", className, ...props }: { size?: "sm" | "md" | "lg"; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div
      className={cn("animate-spin rounded-full border-2 border-border border-t-primary", sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function LoadingOverlay({ isLoading, children, className, ...props }: { isLoading: boolean; children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-text-muted">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function LoadingButton({ isLoading, children, className, ...props }: { isLoading: boolean; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2", className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}

export function ProgressBar({ value, max = 100, showLabel = false, className, ...props }: { value: number; max?: number; showLabel?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>0%</span>
          <span>{Math.round(percentage)}%</span>
          <span>{max}%</span>
        </div>
      )}
    </div>
  )
}

export function CircularProgress({ value, max = 100, size = 64, strokeWidth = 4, showLabel = false, className, ...props }: { value: number; max?: number; size?: number; strokeWidth?: number; showLabel?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }} {...props}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-border"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ filter: "drop-shadow(0 0 2px currentColor)" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-text">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}