import { parsePaging, requireUser, respond } from "$lib/server/http";
import { listNotifications } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// ?unread=1 hanya yang belum dibaca; ?page=&limit=. Selalu menyertakan unreadCount.
export const GET: RequestHandler = ({ locals, url }) =>
  respond(async () => {
    const actor = requireUser(locals);
    const { limit, offset } = parsePaging(url);
    const unreadOnly = ["1", "true"].includes(url.searchParams.get("unread") ?? "");
    return listNotifications(actor.id, { unreadOnly, limit, offset });
  });