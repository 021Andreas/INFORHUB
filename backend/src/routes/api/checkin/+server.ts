import { z } from "zod";
import { checkIn } from "$lib/server/services/event.service";
import { readJson, requireRole, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

const schema = z.object({
  ticketCode: z.string().trim().min(8).max(64),
  method: z.enum(["qr", "manual"]).default("qr"),
});

// Catat kehadiran: hanya penyelenggara acara tsb / admin (dicek di service)
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const body = schema.parse(await readJson(request));
    return checkIn(actor, body.ticketCode, body.method);
  });