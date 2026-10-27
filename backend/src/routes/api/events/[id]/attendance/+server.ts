import { parseId, requireRole, respond } from "$lib/server/http";
import { getAttendanceRecap } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Rekap kehadiran: ringkasan (hadir/belum hadir/persentase) + status tiap peserta
export const GET: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    return getAttendanceRecap(actor, parseId(params.id));
  });