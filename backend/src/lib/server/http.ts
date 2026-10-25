import { json } from "@sveltejs/kit";
import { z } from "zod";
import { AppError, type Actor } from "$lib/server/services/event.service";

type Role = Actor["role"];

/** Membungkus handler: hasil -> JSON, AppError/ZodError -> respons error yang rapi. */
export async function respond(run: () => Promise<unknown>, status = 200) {
  try {
    const data = await run();
    return json(data ?? { ok: true }, { status });
  } catch (e) {
    if (e instanceof AppError) return json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) {
      return json(
        { error: "Data tidak valid", details: z.flattenError(e) },
        { status: 400 },
      );
    }
    console.error(e);
    return json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "Body harus berupa JSON yang valid");
  }
}

export function requireUser(locals: App.Locals): Actor {
  if (!locals.user) throw new AppError(401, "Silakan login terlebih dahulu");
  return { id: locals.user.id, role: locals.user.role };
}

export function requireRole(locals: App.Locals, ...roles: Role[]): Actor {
  const actor = requireUser(locals);
  if (!roles.includes(actor.role)) throw new AppError(403, "Anda tidak punya akses");
  return actor;
}

export function parseId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, "ID tidak valid");
  return n;
}

export function isDuplicateError(e: unknown): boolean {
  const x = e as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return (
    x?.code === "ER_DUP_ENTRY" ||
    x?.cause?.code === "ER_DUP_ENTRY" ||
    x?.errno === 1062 ||
    x?.cause?.errno === 1062
  );
}