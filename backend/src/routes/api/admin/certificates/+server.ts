import { parsePaging, parseId, requireRole, respondList } from "$lib/server/http";
import { listAdminCertificates } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Peserta yang hadir pada acara bersertifikat, sudah terbit (certificateNumber terisi)
// atau belum (null). Penyelenggara hanya melihat acara miliknya. Opsional: ?eventId=1
export const GET: RequestHandler = ({ locals, url }) =>
  respondList(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const eventIdParam = url.searchParams.get("eventId");
    const { limit, offset } = parsePaging(url, 1000, 1000);
    return listAdminCertificates(actor, {
      eventId: eventIdParam ? parseId(eventIdParam) : undefined,
      limit,
      offset,
    });
  });