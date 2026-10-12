'use client'

import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useUiStore } from '@/lib/store/ui'

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 lg:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-lg"
          style={{ animation: 'modal-in .25s ease-out' }}
        >
          {toast.type === 'success' && (
            <CheckCircle2 size={16} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
          )}
          {toast.type === 'error' && (
            <XCircle size={16} className="shrink-0 text-[var(--coral)]" aria-hidden="true" />
          )}
          {toast.type === 'info' && (
            <Info size={16} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          )}
          <p className="text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="ml-2 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-strong)]"
            aria-label="Dismiss notification"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
