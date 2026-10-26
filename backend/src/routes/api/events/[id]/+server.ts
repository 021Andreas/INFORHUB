import { eventBodySchema } from "$lib/server/event-schema";
import { AppError } from "$lib/server/services/event.service";
import { deleteEvent, updateEvent } from "$lib/server/services/event-manage.service";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { getEventDetail } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Detail acara. Publik untuk published/completed; selain itu hanya pemilik/admin.
// Jika login, ikut menyertakan status pendaftaran milik user (myRegistration).
export const GET: RequestHandler = ({ params, locals }) =>
  respond(() =>
    getEventDetail(
      locals.user ? { id: locals.user.id, role: locals.user.role } : null,
      parseId(params.id),
    ),
  );

// Edit sebagian: kirim hanya field yang berubah. Kirim null untuk mengosongkan
// description, posterUrl, categoryId, atau deadline.
export const PATCH: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const patch = eventBodySchema.partial().parse(await readJson(request));
    if (Object.keys(patch).length === 0) throw new AppError(400, "Tidak ada perubahan yang dikirim");
    return updateEvent(actor, parseId(params.id), patch);
  });

// Hapus: hanya acara yang belum pernah dipublikasikan (draft/pending/rejected)
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    return deleteEvent(actor, parseId(params.id));
  });