import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Brand } from "../components/Brand"
import { humanError } from "../lib/errors"
import { getClient, searchMuridByNama } from "../lib/supabase"
import type { MuridCarian } from "../lib/types"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<MuridCarian[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<MuridCarian | null>(null)
  const [error, setError] = useState("")
  const [searching, setSearching] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setMatches([])
      setOpen(false)
      return
    }

    const timer = window.setTimeout(() => {
      setSearching(true)
      searchMuridByNama(getClient(), q)
        .then((rows) => {
          setMatches(rows)
          setOpen(rows.length > 0)
          setActive(0)
          setError("")
        })
        .catch((err) => {
          setError(humanError(err))
          setMatches([])
          setOpen(false)
        })
        .finally(() => setSearching(false))
    }, 220)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function choose(row: MuridCarian) {
    setSelected(row)
    setQuery(row.nama)
    setOpen(false)
    setMatches([])
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Brand />
          <Link
            to="/login"
            className="rounded-md bg-delima px-4 py-2 text-sm font-medium text-white hover:bg-delima-deep"
          >
            Log masuk admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-delima uppercase">Direktori murid</p>
        <h1 className="mt-3 text-4xl font-semibold">Cari ID DELIMA</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
          Taip nama murid. Pilih nama yang sepadan, dan ID DELIMA akan dipaparkan.
        </p>

        <div ref={boxRef} className="relative mt-8">
          <label htmlFor="carian-nama" className="sr-only">
            Nama murid
          </label>
          <input
            id="carian-nama"
            value={query}
            autoComplete="off"
            placeholder="Cari nama murid"
            className="w-full rounded-md border border-line bg-card px-4 py-3.5 text-base outline-none ring-delima/20 focus:border-delima focus:ring-4"
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(null)
            }}
            onFocus={() => {
              if (matches.length) setOpen(true)
            }}
            onKeyDown={(event) => {
              if (!open || !matches.length) return
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActive((index) => (index + 1) % matches.length)
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActive((index) => (index - 1 + matches.length) % matches.length)
              } else if (event.key === "Enter") {
                event.preventDefault()
                choose(matches[active])
              } else if (event.key === "Escape") {
                setOpen(false)
              }
            }}
          />
          {searching ? (
            <p className="mt-2 text-sm text-ink/50">Mencari...</p>
          ) : null}
          {open ? (
            <ul
              role="listbox"
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-card shadow-lg"
            >
              {matches.map((row, index) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                      index === active ? "bg-delima text-white" : "hover:bg-paper"
                    }`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(row)}
                  >
                    <span className="font-medium">{row.nama}</span>
                    <span className={index === active ? "text-white/70" : "text-ink/45"}>{row.kelas}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {query.trim().length >= 2 && !searching && !matches.length && !selected ? (
          <p className="mt-4 text-sm text-ink/60">Tiada nama yang sepadan.</p>
        ) : null}

        {selected ? (
          <section className="mt-8 border border-line bg-card p-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-delima uppercase">Keputusan</p>
            <p className="mt-3 text-2xl font-semibold">{selected.nama}</p>
            <p className="mt-1 text-sm text-ink/55">{selected.kelas}</p>
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/45 uppercase">ID DELIMA</p>
              <p className="mt-2 break-all font-mono text-xl text-delima sm:text-2xl">{selected.id_delima}</p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
