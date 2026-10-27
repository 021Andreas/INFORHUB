import { requireUser, respond } from "$lib/server/http";
import { markAllNotificationsRead } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = ({ locals }) =>
  respond(async () => markAllNotificationsRead(requireUser(locals).id));