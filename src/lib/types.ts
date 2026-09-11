export type Murid = {
  id: string
  kelas: string
  id_delima: string
  nama: string | null
  created_at: string
  updated_at: string
}

export type MuridCarian = {
  id: string
  nama: string
  kelas: string
  id_delima: string
}

export type Admin = {
  id: string
  email: string
  nama: string
  created_at: string
}

export type CsvRow = {
  kelas: string
  id_delima: string
  nama: string
}

export type ParseResult = {
  rows: CsvRow[]
  errors: string[]
  kelasCount: number
}
