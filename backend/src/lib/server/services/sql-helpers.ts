import { sql } from "drizzle-orm";

/**
 * Jumlah pendaftar aktif per acara, dihitung dari tabel registrations.
 * Nama tabel ditulis eksplisit (bukan ${registrations.eventId} / ${events.id}):
 * pada select satu tabel Drizzle membuang prefix tabel, sehingga `id` akan
 * salah dibaca sebagai registrations.id dan hitungannya keliru.
 * Pakai hanya pada query yang `from(events)` tanpa alias.
 */
export const registeredCount = () =>
  sql<number>`(select count(*) from registrations as r where r.event_id = events.id and r.status = 'registered')`.mapWith(
    Number,
  );

/** Jumlah peserta hadir (dari pendaftar aktif) per acara. Aturan pemakaian sama dengan registeredCount. */
export const presentCount = () =>
  sql<number>`(select count(*) from attendance as a inner join registrations as r2 on r2.id = a.registration_id where r2.event_id = events.id and r2.status = 'registered' and a.status = 'present')`.mapWith(
    Number,
  );