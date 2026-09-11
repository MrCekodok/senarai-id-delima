import { useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { Brand } from "../components/Brand"
import { useAuth } from "../lib/auth"
import { humanError } from "../lib/errors"

export default function LoginPage() {
  const { admin, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"login" | "daftar">("login")
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  if (!loading && admin) return <Navigate to="/admin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setNotice("")
    setBusy(true)
    try {
      if (mode === "login") {
        await signIn(email.trim(), password)
      } else {
        const message = await signUp(nama.trim(), email.trim(), password)
        if (message) setNotice(message)
      }
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3.5">
          <Brand />
          <Link to="/" className="text-sm font-medium text-delima hover:text-delima-deep">
            Carian murid
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-16">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-delima uppercase">Akses pentadbir</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {mode === "login" ? "Log masuk admin" : "Daftar admin"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/65">
          {mode === "login"
            ? "Log masuk untuk muat naik CSV, tambah, dan urus senarai murid."
            : "Akaun admin disimpan dalam pangkalan data Supabase."}
        </p>

        <div className="mt-6 grid grid-cols-2 border border-line bg-card text-sm">
          <button
            type="button"
            className={`px-3 py-2.5 font-medium ${mode === "login" ? "bg-delima text-white" : "hover:bg-paper"}`}
            onClick={() => setMode("login")}
          >
            Log masuk
          </button>
          <button
            type="button"
            className={`px-3 py-2.5 font-medium ${mode === "daftar" ? "bg-delima text-white" : "hover:bg-paper"}`}
            onClick={() => setMode("daftar")}
          >
            Daftar
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink/50">
          Jalankan <code className="font-mono">supabase/schema.sql</code> di SQL Editor, dan matikan Confirm email
          di Authentication → Providers → Email supaya daftar terus log masuk.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {mode === "daftar" ? (
            <input
              required
              value={nama}
              onChange={(event) => setNama(event.target.value)}
              placeholder="Nama admin"
              className="w-full rounded-md border border-line bg-card px-3 py-2.5 outline-none ring-delima/20 focus:border-delima focus:ring-4"
            />
          ) : null}
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Emel"
            className="w-full rounded-md border border-line bg-card px-3 py-2.5 outline-none ring-delima/20 focus:border-delima focus:ring-4"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Kata laluan"
            className="w-full rounded-md border border-line bg-card px-3 py-2.5 outline-none ring-delima/20 focus:border-delima focus:ring-4"
          />
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}
          {notice ? (
            <p className="rounded-md border border-leaf/25 bg-leaf/10 px-4 py-3 text-sm text-leaf">{notice}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || loading}
            className="w-full rounded-md bg-delima px-4 py-2.5 font-medium text-white hover:bg-delima-deep disabled:opacity-50"
          >
            {busy ? "Sila tunggu..." : mode === "login" ? "Log masuk" : "Daftar admin"}
          </button>
        </form>
      </main>
    </div>
  )
}
