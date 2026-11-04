import { z } from "zod";
import { parseId, readJson, requireUser, respond } from "$lib/server/http";
import { deleteMyReview, upsertReview } from "$lib/server/services/engagement.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  rating: z.number({ error: "Rating wajib diisi" }).int().min(1, "Rating 1-5").max(5, "Rating 1-5"),
  comment: z.string().trim().max(2000, "Komentar maksimal 2000 karakter").nullable().optional(),
});

// Beri/ubah ulasan milik sendiri. Syarat: tercatat hadir dan acara sudah selesai.
export const PUT: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    return upsertReview(actor.id, parseId(params.id), schema.parse(await readJson(request)));
  });

// Hapus ulasan milik sendiri
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => deleteMyReview(requireUser(locals).id, parseId(params.id)));