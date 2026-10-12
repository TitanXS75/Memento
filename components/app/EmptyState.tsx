'use client'

import { ArrowUpRight } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-xs text-center text-xs leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      )}
      {onAction && actionLabel && (
        <button type="button" onClick={onAction} className="text-link mt-1">
          {actionLabel} <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
