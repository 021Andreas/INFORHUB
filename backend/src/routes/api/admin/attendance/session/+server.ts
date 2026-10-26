import { createAttendanceSession } from "$lib/server/services/attendance.service";
import { parseId, requireRole, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

// Token untuk QR absensi: { token, expiresAt }, berlaku 60 detik.
export const GET: RequestHandler = ({ locals, url }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    return createAttendanceSession(actor, parseId(url.searchParams.get("eventId") ?? undefined));
  });