import { useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { Brand } from "../components/Brand"
import { useAuth } from "../lib/auth"
import { humanError } from "../lib/errors"

export default function LoginPage() {
  const { admin, loading, signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  if (!loading && admin) return <Navigate to="/admin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      await signIn(email.trim(), password)
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
        <h1 className="mt-3 text-3xl font-semibold">Log masuk admin</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/65">
          Log masuk untuk muat naik CSV, tambah, dan urus senarai murid. Pendaftaran akaun baru hanya
          boleh dibuat oleh admin yang sudah log masuk.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Emel"
            autoComplete="username"
            className="w-full rounded-md border border-line bg-card px-3 py-2.5 outline-none ring-delima/20 focus:border-delima focus:ring-4"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Kata laluan"
            autoComplete="current-password"
            className="w-full rounded-md border border-line bg-card px-3 py-2.5 outline-none ring-delima/20 focus:border-delima focus:ring-4"
          />
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || loading}
            className="w-full rounded-md bg-delima px-4 py-2.5 font-medium text-white hover:bg-delima-deep disabled:opacity-50"
          >
            {busy ? "Sila tunggu..." : "Log masuk"}
          </button>
        </form>
      </main>
    </div>
  )
}
