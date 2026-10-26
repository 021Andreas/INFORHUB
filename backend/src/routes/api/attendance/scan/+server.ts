import { z } from "zod";
import { scanAttendance } from "$lib/server/services/attendance.service";
import { readJson, requireUser, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

const schema = z.object({ token: z.string().min(10).max(2000) });

// Peserta yang login memindai QR -> kehadiran tercatat.
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    const { token } = schema.parse(await readJson(request));
    return scanAttendance(actor.id, token);
  });