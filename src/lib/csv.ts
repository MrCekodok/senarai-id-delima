import Papa from "papaparse"
import type { CsvRow, Murid, ParseResult } from "./types"

const KELAS_KEYS = ["kelas", "class", "tingkatan", "nama_kelas"]
const ID_KEYS = ["id_delima", "iddelima", "id delima", "delima", "id", "no_id"]
const NAMA_KEYS = ["nama", "name", "nama_murid", "nama murid"]

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const found = Object.entries(row).find(([header]) => normalizeHeader(header) === key)
    if (found?.[1]?.trim()) return found[1].trim()
  }
  return ""
}

export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  })

  const errors: string[] = []
  const rows: CsvRow[] = []
  const seen = new Set<string>()

  parsed.errors.forEach((item) => {
    if (item.message) errors.push(`Baris ${item.row ?? "?"}: ${item.message}`)
  })

  parsed.data.forEach((raw, index) => {
    const kelas = pick(raw, KELAS_KEYS)
    const id_delima = pick(raw, ID_KEYS)
    const nama = pick(raw, NAMA_KEYS)
    const line = index + 2

    if (!kelas && !id_delima && !nama) return
    if (!kelas || !id_delima) {
      errors.push(`Baris ${line}: kelas dan id_delima wajib diisi.`)
      return
    }
    if (seen.has(id_delima)) {
      errors.push(`Baris ${line}: ID DELIMA ${id_delima} berulang dalam fail.`)
      return
    }

    seen.add(id_delima)
    rows.push({ kelas, id_delima, nama })
  })

  return {
    rows,
    errors,
    kelasCount: new Set(rows.map((row) => row.kelas)).size,
  }
}

export function toCsv(rows: Murid[]) {
  return Papa.unparse(
    rows.map((row) => ({
      kelas: row.kelas,
      id_delima: row.id_delima,
      nama: row.nama ?? "",
    })),
  )
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
