import { env } from "$env/dynamic/private";
import { buildIcs } from "$lib/server/export";
import { errorResponse, parseId } from "$lib/server/http";
import { getEventDetail } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Publik: unduh acara sebagai file kalender (.ics) untuk Google Calendar/Apple/Outlook.
// Hanya acara published/completed (acara lain -> 404).
export const GET: RequestHandler = async ({ params }) => {
  try {
    const id = parseId(params.id);
    const ev = await getEventDetail(null, id);
    const page = env.EVENT_PAGE_URL?.replace(/\/$/, ""); // mis. https://situs-anda/acara -> .../acara/12
    const ics = buildIcs({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      startAt: ev.startAt,
      endAt: ev.endAt,
      url: page ? `${page}/${ev.id}` : undefined,
    });
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="acara-${ev.id}.ics"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};