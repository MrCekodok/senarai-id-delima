import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createAdmin, fetchAdmin, getClient } from "./supabase"
import type { Admin } from "./types"

type AuthContextValue = {
  loading: boolean
  admin: Admin | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (nama: string, email: string, password: string) => Promise<string | null>
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
        let profile = await fetchAdmin(db, userId)
        if (!profile) {
          const { data: userData } = await db.auth.getUser()
          const user = userData.user
          if (user?.email) {
            await createAdmin(db, {
              id: user.id,
              email: user.email,
              nama: String(user.user_metadata.nama || user.email),
            })
            profile = await fetchAdmin(db, user.id)
          }
        }
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
        const { error } = await db.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(nama, email, password) {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { data: { nama } },
        })
        if (error) throw error
        if (data.user && data.session) {
          await createAdmin(db, {
            id: data.user.id,
            email,
            nama,
          })
          setAdmin({
            id: data.user.id,
            email,
            nama,
            created_at: new Date().toISOString(),
          })
          return null
        }
        return "Akaun dicipta. Sahkan emel jika diminta, kemudian log masuk."
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
