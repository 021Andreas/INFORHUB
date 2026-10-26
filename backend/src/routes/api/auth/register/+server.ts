import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { hashPassword, startSession } from "$lib/server/auth";
import { AppError } from "$lib/server/services/event.service";
import { isDuplicateError, readJson, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Format email tidak valid").max(255, "Email maksimal 255 karakter")),
  password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter"),
});

export const POST: RequestHandler = ({ request, cookies }) =>
  respond(async () => {
    const body = schema.parse(await readJson(request));

    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email));
    if (exists) throw new AppError(409, "Email sudah terdaftar");

    let id: number;
    try {
      // Verifikasi email belum diaktifkan -> akun langsung 'active'.
      // Role selalu 'mahasiswa'; role lain hanya boleh diubah admin.
      const [res] = await db.insert(users).values({
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: "mahasiswa",
        status: "active",
      });
      id = res.insertId;
    } catch (e) {
      if (isDuplicateError(e)) throw new AppError(409, "Email sudah terdaftar");
      throw e;
    }

    await startSession(cookies, id);
    return { user: { id, name: body.name, email: body.email, role: "mahasiswa" } };
  }, 201);