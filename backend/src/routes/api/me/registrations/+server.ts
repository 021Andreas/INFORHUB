import { parseRange, requireUser, respond } from "$lib/server/http";
import { listMyRegistrations } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Riwayat pendaftaran milik user yang login (termasuk presensi & id sertifikat).
// Opsional: ?attended=1  ?from=&to=
export const GET: RequestHandler = ({ locals, url }) =>
  respond(async () =>
    listMyRegistrations(requireUser(locals).id, {
      // F-11 riwayat keikutsertaan: ?attended=1 -> hanya acara yang benar-benar dihadiri
      attended: ["1", "true"].includes(url.searchParams.get("attended") ?? ""),
      // F-10 kalender pribadi: ?from=&to=
      ...parseRange(url),
    }),
  );