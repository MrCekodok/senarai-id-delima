const STORAGE_KEY = "delima-supabase-config"

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
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppConfig
    if (parsed.url && parsed.anonKey) return parsed
  } catch {
    return null
  }
  return null
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

export function githubRepoUrl() {
  const repo = import.meta.env.VITE_GITHUB_REPO?.trim()
  return repo || ""
}
