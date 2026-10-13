'use client'

import { ArrowUpRight, FolderPlus, Images, LayoutGrid, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { label: 'Home',     path: '/home',     icon: LayoutGrid },
  { label: 'Trips',    path: '/trips',    icon: FolderPlus },
  { label: 'Media',    path: '/media',    icon: Images },
  { label: 'Settings', path: '/settings', icon: Settings },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mobile-nav"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
        const active = pathname.startsWith(path)
        return (
          <Link
            key={path}
            href={path}
            className={`mobile-nav-button ${active ? 'mobile-nav-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ profileInitials, onEditProfile }: {
  profileInitials: string
  onEditProfile: () => void
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[246px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-6 py-7 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <Logo className="size-7 text-[var(--accent)]" />
        <span className="font-sans text-[22px] tracking-[-0.03em]">Memento</span>
      </div>

      <p className="eyebrow mt-14 px-2">Your space</p>
      <nav className="mt-4 flex flex-col gap-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = pathname.startsWith(path)
          return (
            <Link
              key={path}
              href={path}
              className={`nav-button ${active ? 'nav-button-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {label === 'Media' && (
                <span
                  className="ml-auto size-2 rounded-full bg-[var(--coral)]"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-[var(--surface-strong)] p-4">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <ArrowUpRight size={16} aria-hidden="true" />
          <span className="text-xs font-medium">Offline mode</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
          Your memories stay on your devices. No account or cloud required.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-5">
        <button
          type="button"
          onClick={onEditProfile}
          className="avatar"
          aria-label="Edit your display name"
        >
          {profileInitials}
        </button>
        <div>
          <p className="text-xs font-medium">This device</p>
          <p className="text-[10px] text-[var(--muted)]">Local workspace</p>
        </div>
      </div>
    </aside>
  )
}

export { NAV_ITEMS }
