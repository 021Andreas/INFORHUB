import { z } from "zod";
import { readJson, requireUser, respond } from "$lib/server/http";
import { getProfile, updateProfile } from "$lib/server/services/profile.service";
import type { RequestHandler } from "./$types";

// Profil akun yang login: nim (mahasiswa), organizationName + verificationStatus (penyelenggara)
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => getProfile(requireUser(locals).id));

const patchSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100).optional(),
  // NIM disimpan huruf besar; 5-20 huruf/angka. null = menghapus.
  nim: z
    .union([
      z.null(),
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{5,20}$/, "NIM harus 5-20 karakter huruf/angka"),
    ])
    .optional(),
  organizationName: z.string().trim().min(2).max(150).nullable().optional(),
});

export const PATCH: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    return updateProfile(actor.id, patchSchema.parse(await readJson(request)));
  });