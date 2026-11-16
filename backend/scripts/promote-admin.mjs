// Menjadikan sebuah akun sebagai admin. Role admin sengaja TIDAK bisa diberikan lewat API (F-19).
// Pemakaian:  node scripts/promote-admin.mjs email@contoh.com
// Memakai DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME dari file .env
import "dotenv/config";
import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Pemakaian: node scripts/promote-admin.mjs email@contoh.com");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "inforhub_db",
});

try {
  const [res] = await conn.execute(
    "UPDATE users SET role = 'admin', status = 'active', verification_status = 'verified', verified_at = NOW() WHERE email = ?",
    [email],
  );
  if (res.affectedRows === 0) {
    console.error(`Akun dengan email ${email} tidak ditemukan. Daftar dulu lewat aplikasi, lalu jalankan skrip ini.`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${email} sekarang admin.`);
  }
} finally {
  await conn.end();
}
