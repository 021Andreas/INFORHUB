import { requireUser, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

// Identitas pengguna yang sedang login (dari cookie sesi).
// 401 jika belum login / sesi habis. Dipakai frontend untuk cek sesi dan role.
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    requireUser(locals);
    const { id, name, email, role } = locals.user!;
    return { user: { id, name, email, role } };
  });