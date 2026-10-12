'use client'

import { ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CreateTripInput } from '@/lib/store/trips'

interface CreateTripModalProps {
  onClose: () => void
  onCreate: (input: CreateTripInput) => Promise<void>
}

export function CreateTripModal({ onClose, onCreate }: CreateTripModalProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const today = new Date().toISOString().slice(0, 10)

  const isValid =
    name.trim().length > 0 &&
    startDate !== '' &&
    endDate !== '' &&
    endDate >= startDate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({ name, startDate, endDate, description })
      onClose()
    } catch {
      setError('Failed to create trip. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-trip-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Start collecting</p>
            <h2 id="create-trip-title" className="mt-1 font-sans text-3xl">
              Create a trip
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Trip name */}
          <label className="mt-7 block text-xs font-medium text-[var(--muted)]">
            Trip name *
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sicily slow summer"
              required
              maxLength={100}
              className="field mt-2"
              aria-required="true"
            />
          </label>

          {/* Dates */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[var(--muted)]">
              Start date *
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="field mt-2"
                aria-required="true"
              />
            </label>
            <label className="text-xs font-medium text-[var(--muted)]">
              End date *
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="field mt-2"
                aria-required="true"
              />
            </label>
          </div>

          {/* Description */}
          <label className="mt-4 block text-xs font-medium text-[var(--muted)]">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this trip about? (optional)"
              rows={2}
              maxLength={300}
              className="field mt-2 resize-none"
            />
          </label>

          {/* Error */}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[var(--coral)]/10 px-4 py-3 text-sm text-[var(--coral)]">
              {error}
            </p>
          )}

          {/* Actions */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="primary-button mt-7 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create trip'}
            {!submitting && <ChevronRight size={16} aria-hidden="true" />}
          </button>
        </form>
      </div>
    </div>
  )
}
