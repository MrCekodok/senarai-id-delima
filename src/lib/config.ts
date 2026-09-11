const STORAGE_KEY = "delima-supabase-config"

const DEFAULT_URL = "https://hiuvcfmemcexbqplfcdy.supabase.co"
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXZjZm1lbWNleGJxcGxmY2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwODg5NzMsImV4cCI6MjEwNDY2NDk3M30.tf6pJ4kdi5usOBLH9797KWMFLWx7YGKqylPURiIb6hY"

export type AppConfig = {
  url: string
  anonKey: string
}

export function getConfig(): AppConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppConfig
      if (parsed.url && parsed.anonKey) return parsed
    }
  } catch {
    // guna tetapan kekal di bawah
  }

  return { url: DEFAULT_URL, anonKey: DEFAULT_ANON_KEY }
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

export function githubRepoUrl() {
  const repo = import.meta.env.VITE_GITHUB_REPO?.trim()
  return repo || "https://github.com/MrCekodok/senarai-id-delima"
}
