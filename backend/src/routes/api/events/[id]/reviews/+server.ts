import { parseId, parsePaging, respond } from "$lib/server/http";
import { listReviews } from "$lib/server/services/engagement.service";
import type { RequestHandler } from "./$types";

// Publik: ringkasan (rata-rata, jumlah, sebaran 1-5) + daftar ulasan. Jika login, memuat myReview.
export const GET: RequestHandler = ({ params, locals, url }) =>
  respond(async () => {
    const { limit, offset } = parsePaging(url, 20, 100);
    return listReviews(locals.user?.id ?? null, parseId(params.id), { limit, offset });
  });