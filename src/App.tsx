import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { downloadText, parseCsv, toCsv } from "./lib/csv"
import {
  clearConfig,
  getConfig,
  githubRepoUrl,
  saveConfig,
  type AppConfig,
} from "./lib/config"
import { SCHEMA_SQL } from "./lib/schema"
import {
  deleteMurid,
  fetchMurid,
  insertMurid,
  makeClient,
  upsertMurid,
} from "./lib/supabase"
import type { CsvRow, Murid } from "./lib/types"

type UploadState = {
  fileName: string
  rows: CsvRow[]
  errors: string[]
  kelasCount: number
} | null

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(() => getConfig())
  const [murid, setMurid] = useState<Murid[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [kelas, setKelas] = useState("semua")
  const [query, setQuery] = useState("")
  const [upload, setUpload] = useState<UploadState>(null)
  const [uploading, setUploading] = useState(false)
  const [showSetup, setShowSetup] = useState(() => !getConfig())
  const [form, setForm] = useState({ kelas: "", id_delima: "", nama: "" })
  const fileRef = useRef<HTMLInputElement>(null)

  const client = useMemo(() => (config ? makeClient(config) : null), [config])
  const github = githubRepoUrl()

  async function refresh(nextConfig = config) {
    if (!nextConfig) return
    setLoading(true)
    setError("")
    try {
      const rows = await fetchMurid(makeClient(nextConfig))
      setMurid(rows)
    } catch (err) {
      setError(humanError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [config])

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
    if (!client || !upload?.rows.length) return
    setUploading(true)
    setError("")
    try {
      await upsertMurid(client, upload.rows)
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
    if (!client) return
    setError("")
    try {
      await insertMurid(client, {
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
    if (!client) return
    if (!confirm("Padam rekod murid ini?")) return
    try {
      await deleteMurid(client, id)
      await refresh()
    } catch (err) {
      setError(humanError(err))
    }
  }

  if (showSetup || !config) {
    return (
      <SetupScreen
        github={github}
        onSave={(next) => {
          saveConfig(next)
          setConfig(next)
          setShowSetup(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <Brand />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper"
            >
              Supabase
            </a>
            {github ? (
              <a
                href={github}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper"
              >
                GitHub
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper"
            >
              Tetapan
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-delima px-4 py-1.5 text-sm font-semibold text-white hover:bg-delima-deep"
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
          <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-delima-deep uppercase">Ringkasan</p>
            <p className="mt-2 text-3xl font-semibold">{murid.length}</p>
            <p className="text-sm text-ink/70">murid · {kelasList.length} kelas</p>
          </section>

          <section className="rounded-2xl border border-line bg-card p-3 shadow-sm">
            <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-delima-deep uppercase">Kelas</p>
            <button
              type="button"
              onClick={() => setKelas("semua")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
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
            <p className="rounded-xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm text-leaf">{notice}</p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-delima/30 bg-delima/10 px-4 py-3 text-sm text-delima-deep">{error}</p>
          ) : null}

          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, ID DELIMA atau kelas"
                className="min-w-60 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-delima"
              />
              <button
                type="button"
                onClick={() => downloadText("senarai-id-delima.csv", toCsv(visible))}
                className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-paper"
              >
                Muat turun CSV
              </button>
              <a
                href="/contoh-murid.csv"
                className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-paper"
              >
                Templat CSV
              </a>
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files[0]
                if (file) void onFile(file)
              }}
              className="mt-4 rounded-2xl border border-dashed border-delima/40 bg-delima/5 px-4 py-6 text-center text-sm text-ink/70"
            >
              Seret fail CSV ke sini. Lajur: <code className="font-mono">kelas,id_delima,nama</code>
            </div>
          </div>

          <form
            onSubmit={addOne}
            className="grid gap-2 rounded-2xl border border-line bg-card p-4 shadow-sm md:grid-cols-[1fr_1fr_1.2fr_auto]"
          >
            <input
              required
              value={form.kelas}
              onChange={(event) => setForm({ ...form, kelas: event.target.value })}
              placeholder="Kelas, cth 1 Amanah"
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-delima"
            />
            <input
              required
              value={form.id_delima}
              onChange={(event) => setForm({ ...form, id_delima: event.target.value })}
              placeholder="ID DELIMA"
              className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-delima"
            />
            <input
              value={form.nama}
              onChange={(event) => setForm({ ...form, nama: event.target.value })}
              placeholder="Nama murid (pilihan)"
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-delima"
            />
            <button
              type="submit"
              className="rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Tambah
            </button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-xs tracking-wide text-ink/60 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">ID DELIMA</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
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
          <div className="w-full max-w-xl rounded-3xl bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Papar CSV sebelum muat naik</h2>
            <p className="mt-1 text-sm text-ink/70">
              {upload.fileName}: {upload.rows.length} murid, {upload.kelasCount} kelas.
              ID yang sama akan dikemaskini.
            </p>
            {upload.errors.length ? (
              <ul className="mt-3 max-h-28 overflow-auto rounded-xl bg-delima/10 p-3 text-sm text-delima-deep">
                {upload.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-line">
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
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!upload.rows.length || uploading}
                onClick={() => void submitUpload()}
                className="rounded-xl bg-delima px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-delima text-lg font-bold text-white">
        D
      </span>
      <div>
        <p className="text-sm font-semibold">Senarai ID DELIMA</p>
        <p className="text-xs text-ink/60">Murid mengikut kelas</p>
      </div>
    </div>
  )
}

function SetupScreen({
  github,
  onSave,
}: {
  github: string
  onSave: (config: AppConfig) => void
}) {
  const [url, setUrl] = useState(getConfig()?.url ?? "")
  const [anonKey, setAnonKey] = useState(getConfig()?.anonKey ?? "")
  const [copied, setCopied] = useState(false)

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Sambungkan ke Supabase</h1>
      <p className="mt-2 max-w-2xl text-ink/70">
        Sistem ini menyimpan ID DELIMA murid mengikut kelas, kemudian memuat naik fail CSV terus ke jadual
        Supabase. GitHub menyimpan kod sumber.
      </p>

      <ol className="mt-8 space-y-4 text-sm">
        <li className="rounded-2xl border border-line bg-card p-4">
          <p className="font-semibold">1. Buka projek Supabase</p>
          <p className="mt-1 text-ink/70">
            Cipta atau pilih projek, kemudian salin Project URL dan anon key dari Settings → API.
          </p>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full bg-leaf px-4 py-2 font-semibold text-white"
          >
            Buka papan pemuka Supabase
          </a>
        </li>
        <li className="rounded-2xl border border-line bg-card p-4">
          <p className="font-semibold">2. Jalankan SQL jadual murid</p>
          <p className="mt-1 text-ink/70">SQL Editor → New query → tampal skema ini → Run.</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-ink p-3 font-mono text-xs text-paper">
            {SCHEMA_SQL}
          </pre>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(SCHEMA_SQL)
              setCopied(true)
            }}
            className="mt-3 rounded-full border border-line px-4 py-2"
          >
            {copied ? "SQL disalin" : "Salin SQL"}
          </button>
        </li>
        <li className="rounded-2xl border border-line bg-card p-4">
          <p className="font-semibold">3. Tampal kunci projek</p>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              onSave({ url: url.trim(), anonKey: anonKey.trim() })
            }}
          >
            <input
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-delima"
            />
            <textarea
              required
              value={anonKey}
              onChange={(event) => setAnonKey(event.target.value)}
              placeholder="anon public key"
              rows={3}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 font-mono text-xs outline-none focus:border-delima"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-delima px-4 py-2 font-semibold text-white"
              >
                Simpan dan sambung
              </button>
              <button
                type="button"
                onClick={() => {
                  clearConfig()
                  setUrl("")
                  setAnonKey("")
                }}
                className="rounded-full border border-line px-4 py-2"
              >
                Padam kunci tempatan
              </button>
              {github ? (
                <a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-4 py-2"
                >
                  Buka GitHub
                </a>
              ) : null}
            </div>
          </form>
        </li>
      </ol>
    </div>
  )
}

function humanError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes("Could not find the table")) {
    return "Jadual murid belum wujud. Jalankan SQL skema di Supabase dahulu."
  }
  if (message.includes("Invalid API key") || message.includes("JWT")) {
    return "Kunci Supabase tidak sah. Semak URL dan anon key."
  }
  return message
}
