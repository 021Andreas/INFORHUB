import { parseId, requireRole, respond } from "$lib/server/http";
import { getAdminSubmission } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Detail: desain lengkap (layout), data penyelenggara, dan jejak audit (siapa mengajukan/menyetujui/menolak, kapan, catatan)
export const GET: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    requireRole(locals, "admin");
    return getAdminSubmission(parseId(params.id));
  });
