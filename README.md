# Senarai ID DELIMA Murid

Sistem web untuk menyimpan ID DELIMA murid mengikut kelas, kemudian memuat naik fail CSV ke Supabase.

## CSV

Lajur wajib:

```csv
kelas,id_delima,nama
1 Amanah,D1001001,Ahmad bin Ali
```

Templat: `public/contoh-murid.csv`

## Supabase

1. Cipta projek di [Supabase](https://supabase.com/dashboard).
2. Jalankan `supabase/schema.sql` dalam SQL Editor.
3. Salin Project URL dan anon key ke `.env.local`, atau tampal dalam skrin tetapan aplikasi.

```bash
cp .env.example .env.local
```

## GitHub

Repositori: [github.com/MrCekodok/senarai-id-delima](https://github.com/MrCekodok/senarai-id-delima)

## Jalankan

```bash
npm install
npm run dev
```
