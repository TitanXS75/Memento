'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Trap focus on mount
  useEffect(() => {
    cancelRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
      >
        <div className="flex items-start justify-between">
          <h2 id="confirm-title" className="font-sans text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)]"
            aria-label="Cancel"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p id="confirm-msg" className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          {message}
        </p>

        <div className="mt-7 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="secondary-button flex-1 justify-center"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 justify-center ${
              destructive
                ? 'rounded-xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-4 py-[11px] text-sm font-bold text-[var(--coral)] transition hover:bg-[var(--coral)]/20'
                : 'primary-button'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
