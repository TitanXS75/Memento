'use client'

import { Laptop, Send, Smartphone } from 'lucide-react'
import type { DiscoveredDevice } from '@/lib/services/transfer'

interface DeviceCardProps {
  device: DiscoveredDevice
  onSend: (device: DiscoveredDevice) => void
  isConnected?: boolean
}

export function DeviceCard({ device, onSend, isConnected = false }: DeviceCardProps) {
  const isMobile = device.platform === 'android' || device.platform === 'ios'

  return (
    <div className="surface-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {isMobile ? <Smartphone size={22} aria-hidden="true" /> : <Laptop size={22} aria-hidden="true" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-sans text-lg font-medium text-[var(--foreground)]">
              {device.displayName}
            </h3>
            {isConnected && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {device.platform.toUpperCase()} · {device.ipAddress}:{device.port}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={() => onSend(device)}
          className="primary-button text-xs py-2 px-3.5"
          id={`send-to-${device.id}`}
        >
          <Send size={14} aria-hidden="true" />
          <span>Send Media</span>
        </button>
      </div>
    </div>
  )
}
