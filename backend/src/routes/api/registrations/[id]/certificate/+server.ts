import { renderCertificatePdf } from "$lib/server/certificates/pdf";
import { parseId, requireRole, respond } from "$lib/server/http";
import { issueCertificate } from "$lib/server/services/event.service";
import type { RequestHandler } from "./$types";

// Terbitkan sertifikat untuk satu pendaftaran (id = registrations.id dari /api/admin/certificates)
export const POST: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    return issueCertificate(actor, parseId(params.id), renderCertificatePdf);
  }, 201);