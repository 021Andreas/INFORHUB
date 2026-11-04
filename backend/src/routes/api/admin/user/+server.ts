import { parsePaging, queryEnum, requireRole, respondList } from "$lib/server/http";
import { listUsers } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Array akun (tanpa password_hash / token verifikasi). Total di header X-Total-Count.
// Opsional: ?q=cari nama/email/NIM &role=... &status=... &verification=pending &page= &limit=
export const GET: RequestHandler = ({ locals, url }) =>
  respondList(async () => {
    requireRole(locals, "admin");
    const role = queryEnum(url, "role", ["", "mahasiswa", "penyelenggara", "admin"], "");
    const status = queryEnum(url, "status", ["", "pending_verification", "active", "suspended"], "");
    const verification = queryEnum(url, "verification", ["", "none", "pending", "verified", "rejected"], "");
    const { limit, offset } = parsePaging(url, 1000, 1000);
    return listUsers({
      verification: verification || undefined,
      q: url.searchParams.get("q")?.trim() || undefined,
      role: role || undefined,
      status: status || undefined,
      limit,
      offset,
    });
  });