"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "outline" | "ghost"
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "outline" | "ghost"
  }
  className?: string
  illustration?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  illustration,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : icon ? (
        <div className={cn("mb-6 text-text-muted/50", "h-16 w-16")}>
          {icon}
        </div>
      ) : null}
      
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      
      {description && (
        <p className="text-text-muted max-w-sm mb-6">{description}</p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "primary"}
              className="w-full sm:w-auto gap-2"
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: Omit<EmptyStateProps, "illustration"> & { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-8", className)}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
      />
    </div>
  )
}

export function EmptyStatePage({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: Omit<EmptyStateProps, "illustration"> & { className?: string }) {
  return (
    <div className={cn("min-h-[400px] flex items-center justify-center", className)}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
      />
    </div>
  )
}

export function EmptyStateTable({
  icon,
  title,
  description,
  action,
  colSpan,
  className,
}: Omit<EmptyStateProps, "illustration"> & { colSpan?: number; className?: string }) {
  return (
    <tr className={className}>
      <td colSpan={colSpan || 10} className="py-12 px-4">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </td>
    </tr>
  )
}

export function EmptyStateList({
  icon,
  title,
  description,
  action,
  className,
}: Omit<EmptyStateProps, "illustration"> & { className?: string }) {
  return (
    <div className={cn("py-12 px-4", className)}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
      />
    </div>
  )
}

export function EmptyStateSearch({
  icon,
  title = "No results found",
  description = "Try adjusting your search or filters to find what you're looking for.",
  action,
  className,
}: Omit<EmptyStateProps, "illustration" | "title" | "description"> & { title?: string; description?: string; className?: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}

export function EmptyStateError({
  icon,
  title = "Something went wrong",
  description = "We couldn't load the data. Please try again later.",
  action,
  className,
}: Omit<EmptyStateProps, "illustration" | "title" | "description"> & { title?: string; description?: string; className?: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}

export function EmptyStateNoData({
  icon,
  title = "No data available",
  description = "There's nothing here yet. Get started by creating your first item.",
  action,
  className,
}: Omit<EmptyStateProps, "illustration" | "title" | "description"> & { title?: string; description?: string; className?: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}

export function EmptyStateOffline({
  icon,
  title = "You're offline",
  description = "Check your internet connection and try again.",
  action,
  className,
}: Omit<EmptyStateProps, "illustration" | "title" | "description"> & { title?: string; description?: string; className?: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}

export function EmptyStatePermission({
  icon,
  title = "Access denied",
  description = "You don't have permission to view this content.",
  action,
  className,
}: Omit<EmptyStateProps, "illustration" | "title" | "description"> & { title?: string; description?: string; className?: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}