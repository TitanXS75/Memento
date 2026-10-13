'use client'

import { Calendar, Image as ImageIcon, Package, Video } from 'lucide-react'
import type { MediaItem } from '@/lib/db/schema'

interface ExportStepDateMediaProps {
  step: 1 | 2
  dateGroups: [string, MediaItem[]][]
  selectedDates: Set<string>
  onToggleDate: (dateKey: string) => void
  onToggleAllDates: () => void
  mediaTypeFilter: 'all' | 'photo' | 'video'
  onSelectMediaType: (filter: 'all' | 'photo' | 'video') => void
  canProceed: boolean
  onNext: () => void
  onBack: () => void
}

export function ExportStepDateMedia({
  step,
  dateGroups,
  selectedDates,
  onToggleDate,
  onToggleAllDates,
  mediaTypeFilter,
  onSelectMediaType,
  canProceed,
  onNext,
  onBack,
}: ExportStepDateMediaProps) {
  return (
    <div className="surface-card mt-8 space-y-6 p-6">
      <p className="eyebrow">Step {step} of 3</p>
      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-2xl font-medium">Select Trip Dates</h2>
            <button
              type="button"
              onClick={onToggleAllDates}
              className="secondary-button text-xs py-1 px-3"
            >
              {selectedDates.size === dateGroups.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-2">
            {dateGroups.map(([dateKey, items]) => {
              const isChecked = selectedDates.has(dateKey)
              return (
                <label
                  key={dateKey}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] p-3 text-xs hover:border-[var(--accent)]"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleDate(dateKey)}
                      className="rounded accent-[var(--accent)]"
                    />
                    <Calendar size={14} className="text-[var(--accent)]" />
                    <span className="font-medium text-[var(--foreground)]">{dateKey}</span>
                  </div>
                  <span className="text-[var(--muted)]">{items.length} items</span>
                </label>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-sans text-2xl font-medium">Select Media Types</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'all', label: 'All media', icon: Package },
              { id: 'photo', label: 'Photos only', icon: ImageIcon },
              { id: 'video', label: 'Videos only', icon: Video },
            ].map(({ id: mId, label, icon: Icon }) => (
              <button
                key={mId}
                type="button"
                onClick={() => onSelectMediaType(mId as 'all' | 'photo' | 'video')}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition ${
                  mediaTypeFilter === mId
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between border-t border-[var(--border)] pt-4 text-xs">
        {step > 1 ? (
          <button type="button" onClick={onBack} className="secondary-button">
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="primary-button disabled:opacity-40"
        >
          Next: {step === 1 ? 'Media types' : 'Review & Pack'}
        </button>
      </div>
    </div>
  )
}
