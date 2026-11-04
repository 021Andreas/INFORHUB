import { z } from "zod";
import { eventBodySchema } from "$lib/server/event-schema";
import { parsePaging, parseRange, readJson, requireRole, respond, respondList } from "$lib/server/http";
import { listPublishedEvents } from "$lib/server/services/event.service";
import { createEvent } from "$lib/server/services/event-manage.service";
import type { RequestHandler } from "./$types";

// Publik: acara published, berupa array. Total baris ada di header X-Total-Count.
// Query opsional: ?categoryId=1&q=kata&page=1&limit=100 (limit maksimal 100)
// Kalender (F-10): ?from=2026-12-01&to=2026-12-31 -> acara yang berlangsung dalam rentang itu
export const GET: RequestHandler = ({ url }) =>
  respondList(async () => {
    const { limit, offset } = parsePaging(url, 100, 100);
    const categoryId = Number(url.searchParams.get("categoryId")) || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const { from, to } = parseRange(url);
    const { items, total } = await listPublishedEvents({ categoryId, q, from, to, limit, offset });
    return { items, total };
  });

// status awal: draft (default) | pending (langsung diajukan) | published (hanya admin)
const createSchema = eventBodySchema.extend({
  status: z.enum(["draft", "pending", "published"]).default("draft"),
});

export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const { status, ...input } = createSchema.parse(await readJson(request));
    return createEvent(actor, input, status);
  }, 201);