import { parsePaging, queryEnum, parseId, requireRole, respondList } from "$lib/server/http";
import { listAdminParticipants } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Semua pendaftaran, terbaru dulu. Penyelenggara hanya melihat acara miliknya.
// Opsional: ?eventId=1 &status=registered|cancelled|all (default all)
export const GET: RequestHandler = ({ locals, url }) =>
  respondList(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const status = queryEnum(url, "status", ["all", "registered", "cancelled"], "all");
    const eventIdParam = url.searchParams.get("eventId");
    const { limit, offset } = parsePaging(url, 1000, 1000);
    return listAdminParticipants(actor, {
      eventId: eventIdParam ? parseId(eventIdParam) : undefined,
      status,
      limit,
      offset,
    });
  });