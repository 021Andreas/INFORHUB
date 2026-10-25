import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { startSession, verifyPassword } from "$lib/server/auth";
import { AppError } from "$lib/server/services/event.service";
import { readJson, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

const schema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1).max(72),
});

export const POST: RequestHandler = ({ request, cookies }) =>
  respond(async () => {
    const body = schema.parse(await readJson(request));

    const [u] = await db.select().from(users).where(eq(users.email, body.email));
    const ok = await verifyPassword(body.password, u?.passwordHash);
    if (!u || !ok) throw new AppError(401, "Email atau password salah");

    if (u.status === "suspended") throw new AppError(403, "Akun Anda diblokir");
    if (u.status === "pending_verification")
      throw new AppError(403, "Email Anda belum diverifikasi");

    await startSession(cookies, u.id);
    return { user: { id: u.id, name: u.name, email: u.email, role: u.role } };
  });