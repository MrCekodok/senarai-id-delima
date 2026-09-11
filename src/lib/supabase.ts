import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getConfig } from "./config"
import type { Admin, CsvRow, Murid, MuridCarian } from "./types"

let client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (client) return client
  const config = getConfig()
  if (!config) {
    throw new Error("Tetapan Supabase belum sedia.")
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}

export function makeClient() {
  return getClient()
}

export async function fetchMurid(db: SupabaseClient) {
  const pageSize = 1000
  const all: Murid[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("murid")
      .select("id, kelas, id_delima, nama, created_at, updated_at")
      .order("kelas", { ascending: true })
      .order("nama", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    const rows = (data ?? []) as Murid[]
    all.push(...rows)
    if (rows.length < pageSize) break
  }

  return all
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")
}

export async function searchMuridByNama(db: SupabaseClient, nama: string) {
  const q = nama.trim()
  if (q.length < 2) return [] as MuridCarian[]

  const { data, error } = await db
    .from("murid")
    .select("id, nama, kelas, id_delima")
    .ilike("nama", `%${escapeIlike(q)}%`)
    .not("nama", "is", null)
    .order("nama", { ascending: true })
    .limit(8)

  if (error) throw error
  return ((data ?? []) as MuridCarian[]).filter((row) => row.nama)
}

export async function upsertMurid(db: SupabaseClient, rows: CsvRow[]) {
  const payload = rows.map((row) => ({
    kelas: row.kelas,
    id_delima: row.id_delima,
    nama: row.nama || null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await db.from("murid").upsert(payload, {
    onConflict: "id_delima",
  })

  if (error) throw error
}

export async function insertMurid(db: SupabaseClient, row: CsvRow) {
  const { error } = await db.from("murid").insert({
    kelas: row.kelas,
    id_delima: row.id_delima,
    nama: row.nama || null,
  })
  if (error) throw error
}

export async function deleteMurid(db: SupabaseClient, id: string) {
  const { error } = await db.from("murid").delete().eq("id", id)
  if (error) throw error
}

export async function fetchAdmin(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from("admin")
    .select("id, email, nama, created_at")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw error
  return data as Admin | null
}

export async function createAdmin(
  db: SupabaseClient,
  row: { id: string; email: string; nama: string },
) {
  const { error } = await db.from("admin").upsert(row, { onConflict: "id" })
  if (error) throw error
}
