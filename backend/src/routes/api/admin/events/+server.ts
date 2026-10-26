import { parsePaging, queryEnum, requireRole, respondList } from "$lib/server/http";
import { listAdminEvents } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Admin: semua acara. Penyelenggara: hanya acara miliknya.
// Default ?status=published (untuk halaman Absensi). Nilai lain:
// all | draft | pending | rejected | completed   (?status=pending = antrean persetujuan)
// Tiap baris memuat registered (pendaftar aktif) dan present (hadir).
export const GET: RequestHandler = ({ locals, url }) =>
  respondList(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const status = queryEnum(url, "status", ["published", "all", "draft", "pending", "rejected", "completed"], "published");
    const { limit, offset } = parsePaging(url, 1000, 1000);
    return listAdminEvents(actor, status, { limit, offset });
  });