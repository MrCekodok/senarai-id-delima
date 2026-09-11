import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { Brand } from "../components/Brand"
import { useAuth } from "../lib/auth"
import {
  clearConfig,
  getConfig,
  githubRepoUrl,
  saveConfig,
  type AppConfig,
} from "../lib/config"
import { humanError } from "../lib/errors"
import { SCHEMA_SQL } from "../lib/schema"
import {
  deleteMurid,
  fetchMurid,
  getClient,
  insertMurid,
  upsertMurid,
} from "../lib/supabase"
import type { CsvRow, Murid } from "../lib/types"
import { downloadText, parseCsv, toCsv } from "../lib/csv"

type UploadState = {
  fileName: string
  rows: CsvRow[]
  errors: string[]
  kelasCount: number
} | null

export default function AdminPage() {
  const { admin, loading, signOut } = useAuth()
  const [config, setConfig] = useState<AppConfig | null>(() => getConfig())
  const [murid, setMurid] = useState<Murid[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [kelas, setKelas] = useState("semua")
  const [query, setQuery] = useState("")
  const [upload, setUpload] = useState<UploadState>(null)
  const [uploading, setUploading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [form, setForm] = useState({ kelas: "", id_delima: "", nama: "" })
  const fileRef = useRef<HTMLInputElement>(null)
  const github = githubRepoUrl()

  async function refresh() {
    setListLoading(true)
    setError("")
    try {
      const rows = await fetchMurid(getClient())
      setMurid(rows)
    } catch (err) {
      setError(humanError(err))
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    if (config) saveConfig(config)
    if (admin) void refresh()
  }, [config, admin])

  const kelasList = useMemo(() => {
    const counts = new Map<string, number>()
    murid.forEach((row) => counts.set(row.kelas, (counts.get(row.kelas) ?? 0) + 1))
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "ms"))
  }, [murid])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return murid.filter((row) => {
      const inClass = kelas === "semua" || row.kelas === kelas
      const inSearch =
        !q ||
        row.id_delima.toLowerCase().includes(q) ||
        (row.nama ?? "").toLowerCase().includes(q) ||
        row.kelas.toLowerCase().includes(q)
      return inClass && inSearch
    })
  }, [murid, kelas, query])

  async function onFile(file: File) {
    const text = await file.text()
    const result = parseCsv(text)
    setUpload({
      fileName: file.name,
      rows: result.rows,
      errors: result.errors,
      kelasCount: result.kelasCount,
    })
  }

  async function submitUpload() {
    if (!upload?.rows.length) return
    setUploading(true)
    setError("")
    try {
      await upsertMurid(getClient(), upload.rows)
      setNotice(`${upload.rows.length} rekod dimuat naik ke Supabase.`)
      setUpload(null)
      await refresh()
    } catch (err) {
      setError(humanError(err))
    } finally {
      setUploading(false)
    }
  }

  async function addOne(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await insertMurid(getClient(), {
        kelas: form.kelas.trim(),
        id_delima: form.id_delima.trim(),
        nama: form.nama.trim(),
      })
      setForm({ kelas: form.kelas, id_delima: "", nama: "" })
      setNotice("Murid ditambah.")
      await refresh()
    } catch (err) {
      setError(humanError(err))
    }
  }

  async function remove(id: string) {
    if (!confirm("Padam rekod murid ini?")) return
    try {
      await deleteMurid(getClient(), id)
      await refresh()
    } catch (err) {
      setError(humanError(err))
    }
  }

  if (loading) {
    return <p className="px-5 py-16 text-center text-ink/60">Memuat sesi admin...</p>
  }
  if (!admin) return <Navigate to="/login" replace />

  if (showSetup || !config) {
    return (
      <SetupScreen
        github={github}
        onSave={(next) => {
          saveConfig(next)
          setConfig(next)
          setShowSetup(false)
        }}
        onBack={() => setShowSetup(false)}
      />
    )
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3.5">
          <Brand />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink/55">{admin.nama}</span>
            <Link to="/" className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper">
              Carian
            </Link>
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper"
            >
              Tetapan
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper"
            >
              Log keluar
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-delima px-4 py-1.5 text-sm font-medium text-white hover:bg-delima-deep"
            >
              Muat naik CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void onFile(file)
                event.target.value = ""
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <section className="border border-line bg-card p-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-delima uppercase">Ringkasan</p>
            <p className="mt-2 text-3xl font-semibold">{murid.length}</p>
            <p className="text-sm text-ink/70">murid · {kelasList.length} kelas</p>
          </section>

          <section className="border border-line bg-card p-3">
            <p className="px-1 pb-2 text-[11px] font-semibold tracking-[0.16em] text-delima uppercase">Kelas</p>
            <button
              type="button"
              onClick={() => setKelas("semua")}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                kelas === "semua" ? "bg-delima text-white" : "hover:bg-paper"
              }`}
            >
              <span>Semua kelas</span>
              <span>{murid.length}</span>
            </button>
            <div className="mt-1 max-h-[50vh] space-y-1 overflow-auto">
              {kelasList.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setKelas(name)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                    kelas === name ? "bg-delima text-white" : "hover:bg-paper"
                  }`}
                >
                  <span>{name}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {notice ? (
            <p className="rounded-md border border-leaf/25 bg-leaf/10 px-4 py-3 text-sm text-leaf">{notice}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          <div className="border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, ID DELIMA atau kelas"
                className="min-w-60 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none ring-delima/20 focus:border-delima focus:ring-4"
              />
              <button
                type="button"
                onClick={() => downloadText("senarai-id-delima.csv", toCsv(visible))}
                className="rounded-md border border-line px-3 py-2 text-sm hover:bg-paper"
              >
                Muat turun CSV
              </button>
            </div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files[0]
                if (file) void onFile(file)
              }}
              className="mt-4 border border-dashed border-delima/30 bg-paper px-4 py-6 text-center text-sm text-ink/65"
            >
              Seret fail CSV ke sini. Lajur: <code className="font-mono">kelas,id_delima,nama</code>
            </div>
          </div>

          <form
            onSubmit={addOne}
            className="grid gap-2 border border-line bg-card p-4 md:grid-cols-[1fr_1fr_1.2fr_auto]"
          >
            <input
              required
              value={form.kelas}
              onChange={(event) => setForm({ ...form, kelas: event.target.value })}
              placeholder="Kelas, cth 1 Amanah"
              className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none ring-delima/20 focus:border-delima focus:ring-4"
            />
            <input
              required
              value={form.id_delima}
              onChange={(event) => setForm({ ...form, id_delima: event.target.value })}
              placeholder="ID DELIMA"
              className="rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none ring-delima/20 focus:border-delima focus:ring-4"
            />
            <input
              value={form.nama}
              onChange={(event) => setForm({ ...form, nama: event.target.value })}
              placeholder="Nama murid (pilihan)"
              className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none ring-delima/20 focus:border-delima focus:ring-4"
            />
            <button
              type="submit"
              className="rounded-md bg-leaf px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Tambah
            </button>
          </form>

          <div className="overflow-hidden border border-line bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-[11px] tracking-[0.12em] text-ink/50 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">ID DELIMA</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink/60">
                      Memuat senarai dari Supabase...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink/60">
                      Tiada rekod. Muat naik CSV atau tambah murid.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-4 py-3">{row.kelas}</td>
                      <td className="px-4 py-3 font-mono">{row.id_delima}</td>
                      <td className="px-4 py-3">{row.nama || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="text-delima hover:underline"
                        >
                          Padam
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {upload ? (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-xl border border-line bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Papar CSV sebelum muat naik</h2>
            <p className="mt-1 text-sm text-ink/70">
              {upload.fileName}: {upload.rows.length} murid, {upload.kelasCount} kelas. ID yang sama akan
              dikemaskini.
            </p>
            {upload.errors.length ? (
              <ul className="mt-3 max-h-28 overflow-auto rounded-md bg-red-50 p-3 text-sm text-red-800">
                {upload.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 max-h-56 overflow-auto border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">ID DELIMA</th>
                    <th className="px-3 py-2">Nama</th>
                  </tr>
                </thead>
                <tbody>
                  {upload.rows.slice(0, 40).map((row) => (
                    <tr key={row.id_delima} className="border-t border-line">
                      <td className="px-3 py-2">{row.kelas}</td>
                      <td className="px-3 py-2 font-mono">{row.id_delima}</td>
                      <td className="px-3 py-2">{row.nama || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpload(null)}
                className="rounded-md border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!upload.rows.length || uploading}
                onClick={() => void submitUpload()}
                className="rounded-md bg-delima px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {uploading ? "Memuat naik..." : "Muat naik ke Supabase"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SetupScreen({
  github,
  onSave,
  onBack,
}: {
  github: string
  onSave: (config: AppConfig) => void
  onBack: () => void
}) {
  const [url, setUrl] = useState(getConfig()?.url ?? "")
  const [anonKey, setAnonKey] = useState(getConfig()?.anonKey ?? "")
  const [copied, setCopied] = useState(false)

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Tetapan Supabase</h1>
      <p className="mt-2 text-ink/70">Jalankan SQL ini sekali supaya jadual admin dan polisi log masuk berfungsi.</p>
      <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-delima-deep p-3 font-mono text-xs text-paper">{SCHEMA_SQL}</pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(SCHEMA_SQL)
          setCopied(true)
        }}
        className="mt-3 rounded-md border border-line px-4 py-2 text-sm"
      >
        {copied ? "SQL disalin" : "Salin SQL"}
      </button>
      <form
        className="mt-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ url: url.trim(), anonKey: anonKey.trim() })
        }}
      >
        <input
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 outline-none ring-delima/20 focus:border-delima focus:ring-4"
        />
        <textarea
          required
          value={anonKey}
          onChange={(event) => setAnonKey(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs outline-none ring-delima/20 focus:border-delima focus:ring-4"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-delima px-4 py-2 font-medium text-white">
            Simpan
          </button>
          <button type="button" onClick={onBack} className="rounded-md border border-line px-4 py-2">
            Kembali
          </button>
          <button
            type="button"
            onClick={() => {
              clearConfig()
              setUrl("")
              setAnonKey("")
            }}
            className="rounded-md border border-line px-4 py-2"
          >
            Padam kunci tempatan
          </button>
          {github ? (
            <a href={github} target="_blank" rel="noreferrer" className="rounded-md border border-line px-4 py-2">
              GitHub
            </a>
          ) : null}
        </div>
      </form>
    </div>
  )
}
