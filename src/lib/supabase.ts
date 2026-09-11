import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { AppConfig } from "./config"
import type { CsvRow, Murid } from "./types"

export function makeClient(config: AppConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function fetchMurid(client: SupabaseClient) {
  const { data, error } = await client
    .from("murid")
    .select("id, kelas, id_delima, nama, created_at, updated_at")
    .order("kelas", { ascending: true })
    .order("nama", { ascending: true })

  if (error) throw error
  return (data ?? []) as Murid[]
}

export async function upsertMurid(client: SupabaseClient, rows: CsvRow[]) {
  const payload = rows.map((row) => ({
    kelas: row.kelas,
    id_delima: row.id_delima,
    nama: row.nama || null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await client.from("murid").upsert(payload, {
    onConflict: "id_delima",
  })

  if (error) throw error
}

export async function insertMurid(
  client: SupabaseClient,
  row: CsvRow,
) {
  const { error } = await client.from("murid").insert({
    kelas: row.kelas,
    id_delima: row.id_delima,
    nama: row.nama || null,
  })
  if (error) throw error
}

export async function deleteMurid(client: SupabaseClient, id: string) {
  const { error } = await client.from("murid").delete().eq("id", id)
  if (error) throw error
}
