import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { fetchAdmin, getClient } from "./supabase"
import type { Admin } from "./types"

type AuthContextValue = {
  loading: boolean
  admin: Admin | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const db = useMemo(() => getClient(), [])

  useEffect(() => {
    let active = true

    async function loadUser(userId: string | undefined) {
      if (!userId) {
        if (active) setAdmin(null)
        return
      }
      try {
        const profile = await fetchAdmin(db, userId)
        if (active) setAdmin(profile)
      } catch {
        if (active) setAdmin(null)
      }
    }

    const { data } = db.auth.onAuthStateChange((_event, session) => {
      void loadUser(session?.user.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    db.auth.getSession().then(({ data: sessionData }) => {
      void loadUser(sessionData.session?.user.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [db])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      admin,
      async signIn(email, password) {
        const { data, error } = await db.auth.signInWithPassword({ email, password })
        if (error) throw error
        const userId = data.user?.id
        if (!userId) throw new Error("Sesi log masuk tidak lengkap.")
        const profile = await fetchAdmin(db, userId)
        if (!profile) {
          await db.auth.signOut()
          throw new Error("Akaun ini bukan admin.")
        }
        setAdmin(profile)
      },
      async signOut() {
        await db.auth.signOut()
        setAdmin(null)
      },
    }),
    [admin, db, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth mesti dalam AuthProvider")
  return ctx
}
