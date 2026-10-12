---
name: memento-ui
description: >
  UI and design system patterns for Memento. Use when building new screens,
  components, or modifying existing UI. Covers CSS class usage, component
  library, design tokens, dark mode, accessibility, and mobile-first layout.
---

# Memento — UI & Design System Skill

## Design Language

**Aesthetic:** Premium travel-memory. Warm, quiet, considered.

- Off-white background. Deep charcoal text. Restrained purple accent.
- Coral used sparingly for secondary highlights.
- Clean spacing. Large media previews. Strong visual hierarchy.
- Short, purposeful animations (not decorative).
- Rounded components — not pill-shaped, not sharp-cornered.
- Light borders, restrained shadows.

---

## Typography

Loaded via `next/font/google` in `app/layout.tsx`:

| Variable | Font | Use |
|----------|------|-----|
| `--font-sans` | DM Sans | Body text, UI labels, buttons |
| `--font-serif` | Instrument Serif | Display headings, hero numbers |

To use serif on a heading:
```html
<h1 class="font-serif">Keep the good stuff close.</h1>
```
(The `.font-serif` utility is defined in `globals.css`.)

Do NOT use Inter, Roboto, Arial, or system fonts for new headings.

---

## Design Tokens (CSS Custom Properties)

Defined in `app/globals.css`. Do NOT override these inline without a strong reason.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--background` | `#f5f3f8` | `#101010` | Page background |
| `--foreground` | `#191827` | `#f4f1eb` | Primary text |
| `--sidebar` | `#ebe8f2` | `#151515` | Sidebar background |
| `--surface` | `#fcfbfe` | `#1b1b1b` | Card / input background |
| `--surface-strong` | `#e4e0ed` | `#252525` | Hover states, icon boxes |
| `--border` | `#d8d3e2` | `#343434` | Borders |
| `--muted` | `#777487` | `#aaa7a1` | Secondary text, labels |
| `--accent` | `#4b3f72` | `#9db8ff` | Primary accent, links |
| `--accent-soft` | `#e3def1` | `#202d4a` | Accent hover, badge bg |
| `--coral` | `#b86c7c` | `#e3a08f` | Secondary action, status dot |

---

## CSS Component Classes

These are defined in `globals.css`. Use them — do NOT reinvent with ad-hoc Tailwind classes.

| Class | Purpose |
|-------|---------|
| `.hero-card` | Dark gradient card (home hero, nearby hero) |
| `.surface-card` | Bordered light card with shadow |
| `.icon-box` | Small square accent icon container |
| `.primary-button` | Main CTA button (filled accent) |
| `.primary-light` | Light-on-dark primary button (inside hero-card) |
| `.secondary-button` | Bordered outline button |
| `.text-link` | Inline text link with arrow icon |
| `.empty-state` | Dashed empty state container |
| `.field` | Text input / date input |
| `.modal-backdrop` | Full-screen blurred backdrop |
| `.modal-card` | Centered modal container |
| `.mobile-nav` | Fixed bottom navigation bar |
| `.mobile-nav-button` | Individual bottom nav item |
| `.mobile-nav-active` | Active bottom nav item |
| `.nav-button` | Sidebar nav item |
| `.nav-button-active` | Active sidebar nav item |
| `.avatar` | Circular avatar / initials badge |
| `.toggle` | Toggle switch (Settings) |
| `.toggle-on` | Toggle in ON state |
| `.theme-button` | Dark/light mode toggle button |
| `.eyebrow` | Small uppercase label above headings |
| `.module-enter` | Fade+slide animation for screen transitions |

---

## Dark Mode

Toggle via: `document.documentElement.dataset.theme = 'dark'` / `'light'`

The theme is controlled by `html[data-theme='dark']` CSS selector — NOT `prefers-color-scheme`.

The theme button is already implemented on the Home screen. When extracting into separate routes, persist the theme choice to `localStorage` and apply it in a `useEffect` or in the root layout script.

---

## Component Guidelines

### Adding a new component

1. Create file in `components/app/ComponentName.tsx`
2. Export a named function component with typed props
3. Keep it under ~200 lines
4. Use existing CSS classes from `globals.css` for styling
5. Add `aria-label`, `role`, and `id` attributes as appropriate

### Reusable components to build (not yet created)

| Component | Location | Props |
|-----------|----------|-------|
| `TripCard` | `components/app/TripCard.tsx` | `trip: Trip`, `onShare`, `onArchive`, `onExport` |
| `MediaThumbnail` | `components/app/MediaThumbnail.tsx` | `item: MediaItem`, `onClick`, `selected?` |
| `DateSelector` | `components/app/DateSelector.tsx` | `availableDates`, `selectedDates`, `onChange` |
| `DeviceCard` | `components/app/DeviceCard.tsx` | `device: DiscoveredDevice`, `onConnect` |
| `TransferQueueItem` | `components/app/TransferQueueItem.tsx` | `transfer: Transfer`, `onCancel`, `onRetry` |
| `ArchiveCard` | `components/app/ArchiveCard.tsx` | `archive: Archive`, `onShare`, `onDelete`, `onSave` |
| `ProgressIndicator` | `components/app/ProgressIndicator.tsx` | `pct: number`, `label?: string` |
| `ConfirmDialog` | `components/app/ConfirmDialog.tsx` | `title`, `message`, `onConfirm`, `onCancel` |
| `PermissionExplainer` | `components/app/PermissionExplainer.tsx` | `permission`, `onRequest`, `onDismiss` |
| `EmptyState` | `components/app/EmptyState.tsx` | `title`, `description?`, `action?`, `actionLabel?` |
| `Toast` | `components/app/Toast.tsx` | `message`, `type: 'info'/'success'/'error'` |
| `BottomNav` | `components/app/BottomNav.tsx` | `active: string`, `onChange` |

---

## Navigation

Bottom nav on mobile, left sidebar on desktop (lg+).

Nav items (single source of truth):
```typescript
const NAV_ITEMS = [
  { label: 'Home',     path: '/home',     icon: LayoutGrid },
  { label: 'Trips',    path: '/trips',    icon: FolderPlus },
  { label: 'Nearby',   path: '/nearby',   icon: Wifi },
  { label: 'Archives', path: '/archives', icon: Archive },
  { label: 'Settings', path: '/settings', icon: Settings },
]
```

Note: the current prototype has 4 tabs (no Archives tab). Add Archives as the 4th tab and move Settings to 5th when refactoring.

---

## Mobile-First Layout Rules

- Design for 375px viewport width first.
- Use `sm:`, `md:`, `lg:` breakpoints to adapt.
- Touch targets: minimum 44×44px.
- Respect system safe areas with `safe-area-inset-*` CSS or Capacitor status bar plugin.
- Fixed bottom nav must not overlap content — add `pb-24` to main content on mobile.
- On `lg:` breakpoints, show sidebar and hide bottom nav (`@media (min-width: 1024px) { .mobile-nav { display: none; } }` already in `globals.css`).

---

## Animations

Keep animations short (150–350ms) and purposeful.

Pre-defined:
- `.module-enter` — screen transition (fade + slide up, 320ms)
- `.modal-card` — modal open (fade + scale, 250ms)

Do NOT add looping, purely decorative animations. `prefers-reduced-motion` is respected via the existing media query in `globals.css`.

---

## Accessibility Rules

- Every button must have a clear text label or `aria-label`.
- Images must have `alt` text.
- Modals must have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- Form inputs must be associated with `<label>`.
- Color alone must not be the only indicator of state (pair with text or icon).
- Interactive elements must be keyboard-focusable.
- Toast/notice messages must use `role="status"` or `role="alert"`.

---

## Empty States

Use `EmptyState` component (or the `.empty-state` CSS class) for:
- No trips yet
- No archives yet
- No nearby devices found
- No media in selected date range
- No search results

Always include:
- A short, plain-English explanation.
- A primary action button to resolve the empty state (e.g., "Create your first trip").

---

## Error & Status States

Every async action must have:

| State | UI Treatment |
|-------|-------------|
| Loading | Spinner or skeleton — not blank screen |
| Success | Toast notification or inline success message |
| Error | Inline error with plain-English message + retry if applicable |
| Empty | EmptyState component |
| Permission denied | PermissionExplainer component with settings link |

Never leave the user on a blank screen or with a technical error message.
