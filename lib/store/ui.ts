import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface UiState {
  theme: Theme
  toasts: Toast[]

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'light',
  toasts: [],

  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('memento-theme', theme)
    } catch {
      // localStorage may be unavailable
    }
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    get().setTheme(next)
  },

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    // Auto-dismiss after 4 seconds
    setTimeout(() => get().removeToast(id), 4000)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Call once on app mount to restore persisted theme. */
export function initTheme(): void {
  try {
    const saved = localStorage.getItem('memento-theme') as Theme | null
    const theme: Theme = saved ?? 'light'
    document.documentElement.dataset.theme = theme
    useUiStore.setState({ theme })
  } catch {
    // ignore
  }
}
