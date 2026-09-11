export function humanError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes("Could not find the table")) {
    return "Jadual belum wujud. Jalankan SQL skema di Supabase dahulu."
  }
  if (message.includes("Invalid API key") || message.includes("JWT")) {
    return "Kunci Supabase tidak sah. Semak URL dan anon key."
  }
  if (message.includes("Invalid login credentials")) {
    return "Emel atau kata laluan tidak sah."
  }
  if (message.includes("Akaun ini bukan admin")) {
    return "Akaun ini bukan admin. Minta admin sedia ada mendaftarkan anda."
  }
  if (message.includes("Hanya admin boleh daftar user lain")) {
    return "Hanya admin yang sudah log masuk boleh daftar user lain."
  }
  if (message.includes("User already registered")) {
    return "Emel ini sudah didaftarkan. Sila log masuk."
  }
  if (message.includes("Email not confirmed")) {
    return "Sila sahkan emel dahulu, kemudian log masuk."
  }
  if (message.includes("Could not find the function") || message.includes("schema cache")) {
    return "Fungsi daftar admin belum wujud. Jalankan supabase/schema.sql di SQL Editor."
  }
  if (message.includes("row-level security")) {
    return "Tindakan ini hanya untuk admin yang sudah log masuk. Jalankan SQL skema jika baru disediakan."
  }
  return message
}
