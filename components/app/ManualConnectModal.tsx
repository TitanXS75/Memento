'use client'

import { Info, Wifi, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ManualConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (ip: string, port: number) => Promise<void>
}

export function ManualConnectModal({ isOpen, onClose, onConnect }: ManualConnectModalProps) {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('7734')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ip.trim()) {
      setError('Please enter a valid IP address.')
      return
    }

    setIsConnecting(true)
    setError(null)
    try {
      const portNum = parseInt(port, 10) || 7734
      await onConnect(ip.trim(), portNum)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to IP')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-connect-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="surface-card w-full max-w-md overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Wifi size={18} aria-hidden="true" />
            </span>
            <p className="eyebrow">Direct LAN</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <h2 id="manual-connect-title" className="mt-3 font-sans text-2xl font-medium">
          Connect by IP Address
        </h2>

        <p className="mt-2 text-sm text-[var(--muted)]">
          If automatic discovery is not displaying the peer, enter their local Wi-Fi IP address directly.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="peer-ip-input" className="block text-xs font-medium text-[var(--muted)]">
              Device IP Address
            </label>
            <input
              id="peer-ip-input"
              type="text"
              placeholder="e.g. 192.168.1.45"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="field mt-1.5 w-full"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="peer-port-input" className="block text-xs font-medium text-[var(--muted)]">
              Port
            </label>
            <input
              id="peer-port-input"
              type="number"
              placeholder="7734"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="field mt-1.5 w-full"
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted)]">
            <Info size={16} className="shrink-0 text-[var(--accent)] mt-0.5" aria-hidden="true" />
            <span>
              Both devices must be connected to the exact same Wi-Fi router or portable mobile hotspot.
            </span>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="primary-button"
              id="submit-manual-ip-btn"
            >
              {isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
