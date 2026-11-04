import { z } from "zod";
import { readJson, requireUser, respond } from "$lib/server/http";
import { applyOrganizer } from "$lib/server/services/profile.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  organizationName: z.string().trim().min(2, "Nama organisasi/unit minimal 2 karakter").max(150),
});

// Mahasiswa mengajukan diri menjadi penyelenggara -> verificationStatus 'pending'
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    const { organizationName } = schema.parse(await readJson(request));
    return applyOrganizer(actor.id, organizationName);
  }, 201);